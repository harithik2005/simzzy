/**
 * One-off: undici POST always 500s but curl always works. Test (a) undici with
 * curl-like headers and (b) Node's native https module (different HTTP stack),
 * against read-only topupDetail (non-billable). Whichever returns JSON is the fix.
 *
 *   node --env-file=.env --import tsx src/providers/tsim/probe-format.ts
 */
import https from 'node:https'
import { randomBytes } from 'node:crypto'
import { loadTsimConfig } from '../../config/tsim'
import { buildTsimHeaders } from './signing'

const cfg = loadTsimConfig()
const u = new URL(`${cfg.host}/tsim/v1/topupDetail`)
const id = 'ffffffffffffffffffffffffffffffff'
const hdr = () => buildTsimHeaders({ account: cfg.account, secret: cfg.secret })

function multipart(): { body: Buffer; ct: string } {
  const b = '----x' + randomBytes(8).toString('hex')
  const body = Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="topup_id"\r\n\r\n${id}\r\n--${b}--\r\n`)
  return { body, ct: `multipart/form-data; boundary=${b}` }
}
function show(label: string, status: number | string, text: string) {
  const kind = text.trim().startsWith('{') ? 'JSON ✅' : 'HTML/500 ❌'
  console.log(`${label.padEnd(28)} http=${status} ${kind}: ${text.slice(0, 80).replace(/\s+/g, ' ').trim()}`)
}

async function undiciCurlLike() {
  const { body, ct } = multipart()
  const res = await fetch(u, {
    method: 'POST',
    headers: { ...hdr(), 'Content-Type': ct, 'User-Agent': 'curl/8.5.0', Accept: '*/*', 'Accept-Encoding': 'identity', Connection: 'close' },
    body,
  })
  show('undici + curl-like hdrs', res.status, await res.text())
}

function nodeHttps(): Promise<void> {
  return new Promise((resolve) => {
    const { body, ct } = multipart()
    const req = https.request(
      { hostname: u.hostname, path: u.pathname, method: 'POST', headers: { ...hdr(), 'Content-Type': ct, 'Content-Length': body.length } },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => { show('node:https native', res.statusCode ?? 0, data); resolve() })
      },
    )
    req.on('error', (e) => { show('node:https native', 'ERR', String(e)); resolve() })
    req.write(body)
    req.end()
  })
}

async function main() {
  await undiciCurlLike()
  await nodeHttps()
}
main()
