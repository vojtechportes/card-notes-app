export const parseRetryAfter = (
  value: string | null,
  now = Date.now()
): number | undefined => {
  if (!value) {
    return undefined
  }

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000)
  }

  const date = Date.parse(value)
  if (Number.isNaN(date)) {
    return undefined
  }

  return Math.max(0, date - now)
}
