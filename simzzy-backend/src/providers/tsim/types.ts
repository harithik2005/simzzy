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

/** Result of esimSubscribe — the async order handle. */
export interface TsimSubscribeResult {
  topup_id: string
}

/** topupDetail / getOrderInfoByCustomOrderNo result — populated once provisioned. */
export interface TsimTopupDetail {
  topup_id: string
  device_ids?: string[]
  operator_iccids?: string[]
  number?: number
  success_number?: number
  channel_dataplan_id?: string
  channel_dataplan_name?: string
  day?: number
  create_time?: string
  /** LPA activation strings (e.g. "LPA:1$rsp...$CODE"). Empty until provisioned. */
  lpa_str?: string[]
  /** Hosted QR-code image URLs. Empty until provisioned. */
  qrcode?: string[]
  ios_esim_install_link?: string[]
}

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
