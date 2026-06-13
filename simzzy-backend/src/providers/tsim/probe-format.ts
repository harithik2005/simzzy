/**
 * One-off: verify the node:https POST fix through the REAL client, using the
 * read-only (non-billable) topupDetail with a dummy id. JSON envelope => fixed.
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
