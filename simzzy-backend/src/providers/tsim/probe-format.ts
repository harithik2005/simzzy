/**
 * One-off: is the POST 500 caused by OUR client (undici) or by tSIM?
 * Sends the SAME read-only POST (topupDetail, non-billable) two ways with a
 * valid signature: (a) our app's undici fetch, (b) plain curl. If BOTH 500 it
 * is 100% tSIM-side; if curl works but fetch 500s it is our code.
 *
 *   node --env-file=.env --import tsx src/providers/tsim/probe-format.ts
 */
import { execSync } from 'node:child_process'
import { loadTsimConfig } from '../../config/tsim'
import { buildTsimHeaders } from './signing'

const cfg = loadTsimConfig()
const path = '/tsim/v1/topupDetail'
const field = { topup_id: 'ffffffffffffffffffffffffffffffff' }

async function viaUndici() {
  const headers: Record<string, string> = { ...buildTsimHeaders({ account: cfg.account, secret: cfg.secret }) }
  const fd = new FormData()
  for (const [k, v] of Object.entries(field)) fd.append(k, v)
  const res = await fetch(`${cfg.host}${path}`, { method: 'POST', headers, body: fd })
  const text = await res.text()
  const kind = text.trim().startsWith('{') ? 'JSON ✅' : 'HTML 500 ❌'
  console.log(`\n(a) undici fetch  -> http=${res.status} ${kind}: ${text.slice(0, 160).replace(/\s+/g, ' ').trim()}`)
}

function viaCurl() {
  const h = buildTsimHeaders({ account: cfg.account, secret: cfg.secret })
  const forms = Object.entries(field).map(([k, v]) => `-F "${k}=${v}"`).join(' ')
  const cmd =
    `curl -s --max-time 40 -w "\\nhttp=%{http_code}" ` +
    `-H "TSIM-ACCOUNT: ${h['TSIM-ACCOUNT']}" -H "TSIM-NONCE: ${h['TSIM-NONCE']}" ` +
    `-H "TSIM-TIMESTAMP: ${h['TSIM-TIMESTAMP']}" -H "TSIM-SIGN: ${h['TSIM-SIGN']}" ` +
    `${forms} "${cfg.host}${path}"`
  const out = execSync(cmd, { encoding: 'utf8' })
  const kind = out.trim().startsWith('{') ? 'JSON ✅' : 'HTML 500 ❌'
  console.log(`\n(b) plain curl    -> ${kind}: ${out.slice(0, 180).replace(/\s+/g, ' ').trim()}`)
}

async function main() {
  await viaUndici()
  viaCurl()
}

main()
