/**
 * tSIM (TSim Tech) shared types.
 *
 * Standard envelope:  { code: number, msg: string, result: T }
 * `code === 1` is success ("Success"); any other code is a failure whose
 * meaning is conveyed by `msg` (the spec does not publish a numeric code table,
 * so we surface `msg` verbatim rather than guessing).
 */

export interface TsimResponse<T = unknown> {
  code: number
  msg: string
  result?: T
}

export const TSIM_SUCCESS_CODE = 1

/** A single data-plan row from the dataplan list endpoints. */
export interface TsimDataplan {
  channel_dataplan_id: string
  channel_dataplan_name: string
  price: string
  currency: string
  status: string
  remark?: string
  day: number
  apn?: string
  is_daily?: boolean
  data_allowance?: number
  spec_name?: string
  coverages?: Array<{ country_code: string; telecom_operator?: unknown[] }>
}
