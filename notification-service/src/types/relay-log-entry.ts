export interface RelayLogEntry {
  event: string
  outcome: 'accepted' | 'rejected' | 'completed'
  code?: string
  durationMs?: number
  count?: number
}
