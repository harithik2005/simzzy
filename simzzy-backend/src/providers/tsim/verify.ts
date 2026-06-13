/**
 * tSIM (TSim Tech) READ-ONLY connectivity verification harness — Phase 4H.2A.
 *
 * Run:  npm run verify:tsim    (from simzzy-backend)
 *
 * What it does — and ONLY does:
 *   1. Reports config presence (no secrets).
 *   2. Offline HMAC-SHA256 self-test against a published RFC test vector.
 *   3. If creds are present: signed READ-ONLY probes against the data-plan list
 *      endpoints (product catalog), which mutate NOTHING, to assess
 *      reachability / authentication / permission state.
 *
 * It NEVER calls topup / esimSubscribe / terminate / logisticsApply, nor any
 * write/fulfilment path.
 */
import { tsimConfigStatus, loadTsimConfig } from '../../config/tsim'
import { hmacSha256Hex } from './signing'
import { TsimClient, type TsimCallResult } from './client'

function line(label: string, value: string) {
  console.log(`  ${label.padEnd(26)} ${value}`)
}

/** Step 2 — prove the HMAC-SHA256 implementation against a known RFC vector. */
function runSigningSelfTest(): boolean {
  // Well-known vector: HMAC-SHA256(key="key", msg="The quick brown fox jumps over the lazy dog")
  const got = hmacSha256Hex('The quick brown fox jumps over the lazy dog', 'key')
  const expect = 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8'
  const ok = got === expect
  console.log('\n[2] SIGNING SELF-TEST (offline)')
  line('HMAC-SHA256 vector', ok ? 'PASS' : `FAIL got=${got}`)
  return ok
}

function describe(r: TsimCallResult): string {
  const parts = [`http=${r.httpStatus}`, `ms=${r.ms}`]
  if (r.code !== null) parts.push(`code=${r.code}`)
  parts.push(r.parsedEnvelope ? 'json=yes' : 'json=no')
  if (r.message) parts.push(`msg="${r.message}"`)
  return parts.join(' ')
}

/** Interpret a read-only probe into a reachability/auth verdict. */
function verdict(r: TsimCallResult): { reachable: boolean; authOk: boolean | null; note: string } {
  if (r.httpStatus === 0) return { reachable: false, authOk: null, note: `unreachable: ${r.message}` }
  if (!r.parsedEnvelope) {
    // The full catalogue is large and can stall/truncate on a slow link so
    // JSON.parse fails — but if the 200 body clearly starts with a success
    // envelope, auth+IP+signing are all OK. Treat that as success.
    if (r.httpStatus === 200 && /^\s*\{\s*"code"\s*:\s*1\b/.test(r.message)) {
      return { reachable: true, authOk: true, note: 'code=1 Success (auth OK; large body not fully parsed)' }
    }
    // Reached the server but got a non-JSON (HTML/nginx) body — wrong route/host or gateway error.
    return { reachable: true, authOk: null, note: `non-JSON ${r.httpStatus} response (gateway/route issue): ${r.message}` }
  }
  if (r.code === 1) return { reachable: true, authOk: true, note: 'envelope code=1 Success (auth OK)' }
  // Parsed a JSON envelope with a non-success code: the API accepted & processed
  // the request — auth may have failed; msg explains. If msg is sign/account/nonce
  // related → auth problem; otherwise the request was authenticated but rejected.
  const m = r.message.toLowerCase()
  const authish = /sign|account|nonce|timestamp|auth|whitelist|ip|permission|forbidden/.test(m)
  return { reachable: true, authOk: authish ? false : true, note: `envelope code=${r.code} msg="${r.message}"` }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(' tSIM (TSim Tech) — Phase 4H.2A READ-ONLY connectivity verification')
  console.log('═══════════════════════════════════════════════════════════════')

  // [1] Config presence (no secrets).
  const status = tsimConfigStatus()
  console.log('\n[1] CONFIG (env-driven, secrets masked)')
  line('TSIM_API_HOST', status.host ?? '(unset)')
  line('TSIM_ACCOUNT', status.accountConfigured ? status.accountMasked : '(unset)')
  line('TSIM_SECRET', status.secretConfigured ? status.secretMasked : '(unset)')
  line('Egress proxy', status.proxyConfigured ? `${status.proxyHost} (static-IP — tSIM sees this)` : '(none — direct egress)')

  // [2] Offline signing self-test.
  const signingOk = runSigningSelfTest()

  // [3] Live read-only probes.
  const credsReady = status.hostConfigured && status.accountConfigured && status.secretConfigured
  let live: { reachable: boolean; authOk: boolean | null; note: string } = {
    reachable: false,
    authOk: null,
    note: 'skipped — credentials not configured',
  }
  let planCount: number | null = null
  let sampleNames: string[] = []

  if (!credsReady) {
    console.log('\n[3] LIVE PROBES — SKIPPED (set TSIM_API_HOST / TSIM_ACCOUNT / TSIM_SECRET to run)')
  } else {
    console.log('\n[3] LIVE READ-ONLY PROBES (data-plan list — mutates nothing)')
    let client: TsimClient
    try {
      client = new TsimClient(loadTsimConfig())
    } catch (e) {
      console.log(`  client init failed: ${(e as Error).message}`)
      return finalReport({ signingOk, live, credsReady, planCount, sampleNames })
    }

    // Probe — v1 data-plan list. This is the endpoint that works for this
    // account (v2 returns an nginx 500; it isn't provisioned). It ignores
    // pagination and returns the full catalogue, so it's slow on a poor link
    // but authoritative for an auth/connectivity check.
    const v1 = await client.dataplanListV1()
    line('GET /tsim/v1/dataplanList', describe(v1))
    live = verdict(v1)
    if (Array.isArray(v1.result)) {
      planCount = v1.result.length
      sampleNames = v1.result.slice(0, 3).map((p) => p.channel_dataplan_name)
    }

    line('→ verdict', `reachable=${live.reachable} authOk=${live.authOk} — ${live.note}`)
  }

  finalReport({ signingOk, live, credsReady, planCount, sampleNames })
}

function finalReport(args: {
  signingOk: boolean
  credsReady: boolean
  live: { reachable: boolean; authOk: boolean | null; note: string }
  planCount: number | null
  sampleNames: string[]
}) {
  const { signingOk, credsReady, live, planCount, sampleNames } = args
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log(' PROVIDER HEALTH REPORT')
  console.log('═══════════════════════════════════════════════════════════════')
  line('Signing implementation', signingOk ? 'VERIFIED (RFC vector matches)' : 'FAILED')
  line('Credentials configured', credsReady ? 'YES' : 'NO (env vars unset)')
  line('API reachability', live.reachable ? 'REACHABLE' : credsReady ? 'UNREACHABLE' : 'NOT TESTED')
  line('Authentication', live.authOk === true ? 'OK' : live.authOk === false ? 'FAILED' : 'NOT DETERMINED')
  line('Product endpoint', live.authOk === true ? `OK — /tsim dataplan list${planCount !== null ? ` (${planCount} eSIM plans)` : ''}` : 'data-plan list (read-only)')
  if (sampleNames.length) line('  sample plans', sampleNames.join(' | '))
  line('Balance endpoint', 'N/A — TSim API exposes no balance/wallet endpoint')
  line('Notes', live.note)
  console.log('═══════════════════════════════════════════════════════════════\n')
}

main().catch((e) => {
  console.error('verify.ts fatal:', e instanceof Error ? e.message : e)
  process.exitCode = 1
})
