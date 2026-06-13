/**
 * One-off: find the real difference between undici (500) and curl (works) on
 * tSIM POST. Tries several undici encodings + curl over HTTP/2 and HTTP/1.1
 * against the read-only topupDetail (non-billable).
 *
 *   node --env-file=.env --import tsx src/providers/tsim/probe-format.ts
 */
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { loadTsimConfig } from '../../config/tsim'
import { buildTsimHeaders } from './signing'

const cfg = loadTsimConfig()
const url = `${cfg.host}/tsim/v1/topupDetail`
const id = 'ffffffffffffffffffffffffffffffff'
const hdr = () => buildTsimHeaders({ account: cfg.account, secret: cfg.secret })

function show(label: string, status: string | number, text: string) {
  const kind = text.trim().startsWith('{') ? 'JSON ✅' : 'HTML/500 ❌'
  console.log(`${label.padEnd(30)} http=${status} ${kind}: ${text.slice(0, 80).replace(/\s+/g, ' ').trim()}`)
}

async function undiciMultipart() {
  const b = '----x' + randomBytes(8).toString('hex')
  const body = Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="topup_id"\r\n\r\n${id}\r\n--${b}--\r\n`)
  const res = await fetch(url, { method: 'POST', headers: { ...hdr(), 'Content-Type': `multipart/form-data; boundary=${b}` }, body })
  show('undici multipart', res.status, await res.text())
}
async function undiciUrlencoded() {
  const res = await fetch(url, { method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: `topup_id=${id}` })
  show('undici urlencoded', res.status, await res.text())
}
function curl(label: string, extra: string) {
  const h = hdr()
  const cmd =
    `curl -s -w "\\nHTTP%{http_code}" ${extra} ` +
    `-H "TSIM-ACCOUNT: ${h['TSIM-ACCOUNT']}" -H "TSIM-NONCE: ${h['TSIM-NONCE']}" ` +
    `-H "TSIM-TIMESTAMP: ${h['TSIM-TIMESTAMP']}" -H "TSIM-SIGN: ${h['TSIM-SIGN']}" ` +
    `-F "topup_id=${id}" "${url}"`
  let out = ''
  try { out = execSync(cmd, { encoding: 'utf8' }) } catch (e) { out = String(e) }
  const m = out.match(/HTTP(\d+)\s*$/)
  show(label, m ? m[1] : '?', out.replace(/\s*HTTP\d+\s*$/, ''))
}

async function main() {
  await undiciMultipart()
  await undiciUrlencoded()
  curl('curl -F (default h2)', '')
  curl('curl -F --http1.1', '--http1.1')
}
main()
