import type { SyncTrigger } from '../types/sync-trigger.js'

export const sendSyncTrigger = async (
  apiBaseUrl: string,
  trigger: SyncTrigger,
  fetchImplementation: typeof fetch = fetch,
  timeoutMs = 2_000
): Promise<void> => {
  try {
    await fetchImplementation(`${apiBaseUrl}/sync/trigger`, {
      body: JSON.stringify({ trigger }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    // The durable outbox remains authoritative while the backend is unavailable.
  }
}
