/**
 * tSIM (TSim Tech) provider — read-only barrel (Phase 4H.2A).
 * Exposes the client + signing helpers + types. No fulfilment (write) methods.
 */
export { TsimClient } from './client'
export type { TsimCallResult } from './client'
export { hmacSha256Hex, makeNonce, buildTsimHeaders } from './signing'
export type { TsimAuthHeaders } from './signing'
export { TSIM_SUCCESS_CODE } from './types'
export type { TsimResponse, TsimDataplan } from './types'
