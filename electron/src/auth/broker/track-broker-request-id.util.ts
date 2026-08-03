const BROKER_REQUEST_ID_RETENTION_MS = 10 * 60 * 1000
const MAXIMUM_TRACKED_BROKER_REQUEST_IDS = 2048

export const trackBrokerRequestId = (
  requestIds: Map<string, number>,
  requestId: string,
  nowMs = Date.now()
): boolean => {
  for (const [trackedRequestId, expiresAtMs] of requestIds) {
    if (expiresAtMs <= nowMs) {
      requestIds.delete(trackedRequestId)
    }
  }

  if (requestIds.has(requestId)) {
    return false
  }

  while (requestIds.size >= MAXIMUM_TRACKED_BROKER_REQUEST_IDS) {
    const oldestRequestId = requestIds.keys().next().value as string | undefined

    if (!oldestRequestId) {
      break
    }

    requestIds.delete(oldestRequestId)
  }

  requestIds.set(requestId, nowMs + BROKER_REQUEST_ID_RETENTION_MS)

  return true
}
