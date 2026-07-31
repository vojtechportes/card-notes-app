export const normalizeSyncDate = (value: unknown): string => {
  const text = String(value)
  const normalized = text.includes('T') ? text : text.replace(' ', 'T') + 'Z'
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Synchronization timestamp is invalid: ${text}`)
  }
  return date.toISOString()
}
