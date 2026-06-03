import { NextResponse } from 'next/server'
import { TsimClient, type TsimDataplan } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tsim-check — Phase 4H.2A read-only connectivity probe.
 *
 * Admin-only. Calls tSIM's `esimDataplanList` (a READ — mutates nothing, no
 * purchase) from the deployed server, so its egress IP is what tSIM sees. Use
 * this to confirm the IP allowlist + credentials once tSIM whitelists the host:
 *   - code: 1                       → ✅ whitelist + creds OK (ready for 4H.2B)
 *   - code: 2000 "IP not allowed"   → ⛔ IP still not whitelisted
 *   - config error                  → TSIM_* env vars missing/wrong
 *
 * Never exposes secrets — only the provider's response code/message + counts.
 */
export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  try {
    const client = new TsimClient()
    const res = await client.esimDataplanListV1()
    const plans = (Array.isArray(res.result) ? res.result : []) as TsimDataplan[]
    return NextResponse.json({
      ok: res.ok,
      whitelisted: res.code === 1, // code 1 = success; 2000 = IP not allowed
      httpStatus: res.httpStatus,
      code: res.code,
      msg: res.message,
      parsedEnvelope: res.parsedEnvelope,
      ms: res.ms,
      samplePlanCount: plans.length,
      sampleNames: plans.slice(0, 3).map((p) => p.channel_dataplan_name),
    })
  } catch (e) {
    // Most likely: TSIM_API_HOST/ACCOUNT/SECRET not set on the server.
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
