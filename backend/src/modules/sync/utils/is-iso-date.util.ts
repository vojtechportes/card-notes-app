export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false
  }

  const date = new Date(value)

  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}
