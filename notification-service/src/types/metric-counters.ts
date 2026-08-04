export interface MetricCounters {
  authAccepted: number
  authRejected: number
  webhookAccepted: number
  webhookRejected: number
  webhookDuplicate: number
  broadcasts: number
  rateLimited: number
}
