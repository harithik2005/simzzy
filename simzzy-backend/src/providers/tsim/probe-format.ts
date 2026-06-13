/**
 * One-off: does this account's authenticated POST endpoints work at all?
 * Probes the READ-ONLY `topupDetail` (non-billable) using the doc-correct
 * multipart/form-data format with a WELL-FORMED (but non-existent) 32-hex
 * topup_id. A JSON "not found" => POST works (esimSubscribe 500 is balance/
 * permission). Another nginx 500 => POST endpoints are broken for this account.
 *
 *   node --env-file=.env --import tsx src/providers/tsim/probe-format.ts
 */
import { loadTsimConfig } from '../../config/tsim'
import { buildTsimHeaders } from './signing'

const cfg = loadTsimConfig()

async function postForm(path: string, fields: Record<string, string>) {
  const headers: Record<string, string> = { ...buildTsimHeaders({ account: cfg.account, secret: cfg.secret }) }
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  const res = await fetch(`${cfg.host}${path}`, { method: 'POST', headers, body: fd })
  const text = await res.text()
  const kind = text.trim().startsWith('{') ? 'JSON ✅' : 'HTML 500 ❌'
  console.log(`\nPOST ${path}  ${JSON.stringify(fields)}`)
  console.log(`  http=${res.status} ${kind}: ${text.slice(0, 200).replace(/\s+/g, ' ').trim()}`)
}

async function main() {
  // Well-formed 32-hex id that won't exist for this account -> expect JSON "not found".
  await postForm('/tsim/v1/topupDetail', { topup_id: 'ffffffffffffffffffffffffffffffff' })
  // Cross-check another read-only POST that looks up by a custom order number.
  await postForm('/tsim/v1/getOrderInfoByCustomOrderNo', { custom_order_no: 'probe-test-0001' })
}

main()
