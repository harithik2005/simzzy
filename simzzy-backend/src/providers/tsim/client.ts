/**
 * tSIM (TSim Tech) API client — READ-ONLY surface.
 *
 * Phase 4H.2A deliberately exposes ONLY non-mutating endpoints. The write
 * endpoints (topup / esimSubscribe / terminate / logisticsApply) are NOT
 * implemented here on purpose: this module is for connectivity & permission
 * verification, not fulfilment.
 *
 * Every request is signed with the four TSIM-* headers (see ./signing) and
 * returns the `{ code, msg, result }` envelope (code === 1 = success).
 */
import { randomBytes } from 'node:crypto'
import { request as httpsRequest } from 'node:https'
import { ProxyAgent, type Dispatcher } from 'undici'
import { loadTsimConfig, type TsimConfig } from '../../config/tsim'
import { buildTsimHeaders } from './signing'
import {
  TSIM_SUCCESS_CODE,
  type TsimDataplan,
  type TsimResponse,
  type TsimSubscribeResult,
  type TsimTopupDetail,
} from './types'

export interface TsimCallResult<T = unknown> {
  ok: boolean
  /** HTTP status (0 if the request never completed — DNS/TLS/timeout). */
  httpStatus: number
  /** Business code from the envelope (1 = success), if parsed. */
  code: number | null
  /** Provider message, or a local error description. */
  message: string
  result: T | null
  /** True when a JSON envelope was parsed (vs. an HTML/error page). */
  parsedEnvelope: boolean
  /** Round-trip time in ms. */
  ms: number
}

const DEFAULT_TIMEOUT_MS = 60_000

/**
 * Build a multipart/form-data body as a Buffer (with explicit boundary) so the
 * POST goes out with a fixed Content-Length. tSIM's Tomcat multipart parser
 * 500s on chunked uploads — which is what undici sends for a FormData/stream
 * body — whereas curl works because it sets Content-Length. Verified live.
 */
function buildMultipartForm(fields: Record<string, string | number | undefined>): {
  body: Buffer
  contentType: string
} {
  const boundary = '----simzzytsim' + randomBytes(12).toString('hex')
  const chunks: Buffer[] = []
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === '') continue
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${String(v)}\r\n`))
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`))
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` }
}

export class TsimClient {
  private readonly cfg: TsimConfig
  /** Static-IP egress proxy dispatcher, built once if a proxy URL is configured. */
  private readonly dispatcher?: Dispatcher

  constructor(cfg?: TsimConfig) {
    this.cfg = cfg ?? loadTsimConfig()
    this.dispatcher = this.cfg.proxyUrl ? new ProxyAgent(this.cfg.proxyUrl) : undefined
  }

  private url(path: string, query?: Record<string, string | number | undefined>): string {
    const p = path.startsWith('/') ? path : `/${path}`
    const u = new URL(this.cfg.host + p)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') u.searchParams.set(k, String(v))
      }
    }
    return u.toString()
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: { query?: Record<string, string | number | undefined>; body?: Record<string, unknown> } = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<TsimCallResult<T>> {
    const headers = buildTsimHeaders({ account: this.cfg.account, secret: this.cfg.secret })
    const url = this.url(path, opts.query)
    const started = Date.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: method === 'POST' ? JSON.stringify(opts.body ?? {}) : undefined,
        signal: controller.signal,
        // Route through the static-IP proxy when configured (tSIM IP allowlist).
        // `dispatcher` is an undici fetch option not present in the DOM RequestInit type.
        ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
      } as RequestInit & { dispatcher?: Dispatcher })
      const ms = Date.now() - started
      let parsed: TsimResponse<T> | null = null
      let text = ''
      try {
        text = await res.text()
        const j = text ? JSON.parse(text) : null
        if (j && typeof j === 'object' && 'code' in j) parsed = j as TsimResponse<T>
      } catch {
        /* non-JSON (e.g. nginx HTML error page) — leave parsed null */
      }
      return {
        ok: res.ok && parsed?.code === TSIM_SUCCESS_CODE,
        httpStatus: res.status,
        code: parsed?.code ?? null,
        message: parsed?.msg ?? (text ? text.slice(0, 200).replace(/\s+/g, ' ').trim() : res.statusText),
        result: parsed?.result ?? null,
        parsedEnvelope: parsed !== null,
        ms,
      }
    } catch (err) {
      const ms = Date.now() - started
      const aborted = err instanceof Error && err.name === 'AbortError'
      return {
        ok: false,
        httpStatus: 0,
        code: null,
        message: aborted ? `timeout after ${timeoutMs}ms` : err instanceof Error ? err.message : String(err),
        result: null,
        parsedEnvelope: false,
        ms,
      }
    } finally {
      clearTimeout(timer)
    }
  }

  /* ── READ-ONLY endpoints ──────────────────────────────────────────────── */

  /** v2 paginated data-plan list — `/tsim/v2/dataplanList`. The primary read probe. */
  dataplanListV2(query: { pageNo?: number; pageSize?: number; type?: string } = {}) {
    return this.request<unknown>('GET', '/tsim/v2/dataplanList', {
      query: { pageNo: query.pageNo ?? 1, pageSize: query.pageSize ?? 1, type: query.type },
    })
  }

  /** v1 full data-plan list (deprecated upstream) — `/tsim/v1/dataplanList`. */
  dataplanListV1() {
    return this.request<TsimDataplan[]>('GET', '/tsim/v1/dataplanList')
  }

  /** v1 eSIM data-plan list (deprecated upstream) — `/tsim/v1/esimDataplanList`. */
  esimDataplanListV1() {
    return this.request<TsimDataplan[]>('GET', '/tsim/v1/esimDataplanList')
  }

  /** v2 single plan detail — `/tsim/v2/dataplanInfo?channel_dataplan_id=`. */
  dataplanInfoV2(channelDataplanId: string) {
    return this.request<TsimDataplan>('GET', '/tsim/v2/dataplanInfo', { query: { channel_dataplan_id: channelDataplanId } })
  }

  /* ── form-data POST (tSIM write/poll endpoints use multipart/form-data) ── */

  private requestForm<T>(
    path: string,
    fields: Record<string, string | number | undefined>,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<TsimCallResult<T>> {
    // tSIM's server rejects undici/`fetch` POST bodies with an HTTP 500 (a
    // low-level request-framing quirk — verified live: identical POST 500s via
    // fetch but returns JSON via curl / node:https). So write+poll endpoints go
    // through Node's native https stack, which behaves like curl.
    // TSIM-* signature is over account+nonce+timestamp only — independent of body.
    if (this.cfg.proxyUrl) {
      // The GET path tunnels through the static-IP proxy via undici's dispatcher;
      // this node:https POST path does not. Don't silently egress from the wrong
      // IP — writes must run from a host whose own IP is whitelisted.
      return Promise.resolve({
        ok: false, httpStatus: 0, code: null,
        message: 'tSIM form POST cannot use TSIM_PROXY_URL — run write/fulfilment from a host with a whitelisted egress IP',
        result: null, parsedEnvelope: false, ms: 0,
      })
    }
    const headers = buildTsimHeaders({ account: this.cfg.account, secret: this.cfg.secret })
    const { body, contentType } = buildMultipartForm(fields)
    const u = new URL(this.url(path))
    const started = Date.now()

    return new Promise<TsimCallResult<T>>((resolve) => {
      const req = httpsRequest(
        {
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + u.search,
          method: 'POST',
          headers: { ...headers, 'Content-Type': contentType, 'Content-Length': body.length },
          timeout: timeoutMs,
        },
        (res) => {
          let text = ''
          res.setEncoding('utf8')
          res.on('data', (c) => (text += c))
          res.on('end', () => {
            const ms = Date.now() - started
            const status = res.statusCode ?? 0
            let parsed: TsimResponse<T> | null = null
            try {
              const j = text ? JSON.parse(text) : null
              if (j && typeof j === 'object' && 'code' in j) parsed = j as TsimResponse<T>
            } catch {
              /* non-JSON (HTML error page) */
            }
            resolve({
              ok: status >= 200 && status < 300 && parsed?.code === TSIM_SUCCESS_CODE,
              httpStatus: status,
              code: parsed?.code ?? null,
              message: parsed?.msg ?? (text ? text.slice(0, 200).replace(/\s+/g, ' ').trim() : ''),
              result: parsed?.result ?? null,
              parsedEnvelope: parsed !== null,
              ms,
            })
          })
        },
      )
      req.on('timeout', () => req.destroy(new Error(`timeout after ${timeoutMs}ms`)))
      req.on('error', (err) =>
        resolve({
          ok: false, httpStatus: 0, code: null,
          message: err instanceof Error ? err.message : String(err),
          result: null, parsedEnvelope: false, ms: Date.now() - started,
        }),
      )
      req.write(body)
      req.end()
    })
  }

  /* ── WRITE / fulfilment (used by 4H.2B; gated by TSIM_FULFILMENT_ENABLED) ── */

  /**
   * Order new eSIM(s) — `POST /tsim/v1/esimSubscribe` (form-data).
   * ⚠️ BILLABLE: consumes tSIM balance and creates real eSIM(s). Returns a
   * `topup_id` to poll with `topupDetail` for the QR/LPA.
   */
  esimSubscribe(args: { channelDataplanId: string; number?: number; remark?: string }) {
    return this.requestForm<TsimSubscribeResult>('/tsim/v1/esimSubscribe', {
      number: args.number ?? 1,
      channel_dataplan_id: args.channelDataplanId,
      remark: args.remark,
    })
  }

  /**
   * Order/topup detail — `POST /tsim/v1/topupDetail` (form-data). Read-only.
   * `lpa_str`/`qrcode` are empty until tSIM finishes provisioning (poll it).
   */
  topupDetail(topupId: string) {
    return this.requestForm<TsimTopupDetail>('/tsim/v1/topupDetail', { topup_id: topupId })
  }

  /** Device/usage detail — `POST /tsim/v1/deviceDetail` (form-data). Read-only. */
  deviceDetail(args: { deviceId: string; topupId?: string }) {
    return this.requestForm<unknown>('/tsim/v1/deviceDetail', { device_id: args.deviceId, topup_id: args.topupId })
  }
}
