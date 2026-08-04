export interface WebhookResult {
  accepted: boolean
  duplicate: boolean
  coalesceAt: number | null
}
