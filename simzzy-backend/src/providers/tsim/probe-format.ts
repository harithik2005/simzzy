/**
 * One-off: verify the multipart Content-Length fix through the REAL client.
 * Calls the read-only (non-billable) topupDetail with a dummy id. If it now
 * returns a JSON envelope (e.g. code 1006 "No results were found") instead of
 * an HTTP 500, the fix works and esimSubscribe will too.
 *
 *   node --env-file=.env --import tsx src/providers/tsim/probe-format.ts
 */
import { loadTsimConfig } from '../../config/tsim'
import { TsimClient } from './client'

async function main() {
  const client = new TsimClient(loadTsimConfig())
  const r = await client.topupDetail('ffffffffffffffffffffffffffffffff')
  const ok = r.parsedEnvelope ? 'JSON ✅ (fix works)' : 'HTML 500 ❌ (still broken)'
  console.log(`\ntopupDetail via fixed client -> http=${r.httpStatus} ${ok}`)
  console.log(`  code=${r.code} msg="${r.message}"`)
}

main()
