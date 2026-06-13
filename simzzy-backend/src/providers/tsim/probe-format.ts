/**
 * One-off: determine which request body format tSIM's write/form endpoints
 * accept. Probes the READ-ONLY `topupDetail` (non-billable) with a dummy
 * topup_id in three encodings and prints what tSIM returns.
 *
 *   node --env-file=.env --import tsx src/providers/tsim/probe-format.ts
 */
import { loadTsimConfig } from '../../config/tsim'
import { buildTsimHeaders } from './signing'

const cfg = loadTsimConfig()
const url = `${cfg.host}/tsim/v1/topupDetail`

async function probe(label: string, body: BodyInit, contentType?: string) {
  const headers: Record<string, string> = { ...buildTsimHeaders({ account: cfg.account, secret: cfg.secret }) }
  if (contentType) headers['Content-Type'] = contentType
  try {
    const res = await fetch(url, { method: 'POST', headers, body })
    const text = await res.text()
    const kind = text.trim().startsWith('{') ? 'JSON ✅' : 'HTML/other ❌'
    console.log(`\n== ${label} ==`)
    console.log(`http=${res.status} ${kind}: ${text.slice(0, 180).replace(/\s+/g, ' ').trim()}`)
  } catch (e) {
    console.log(`\n== ${label} ==\nERROR: ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function main() {
  const fd = new FormData()
  fd.append('topup_id', 'test123')
  await probe('1 multipart (current code)', fd) // fetch sets multipart boundary

  await probe('2 x-www-form-urlencoded', new URLSearchParams({ topup_id: 'test123' }), 'application/x-www-form-urlencoded')

  await probe('3 application/json', JSON.stringify({ topup_id: 'test123' }), 'application/json')
}

main()
