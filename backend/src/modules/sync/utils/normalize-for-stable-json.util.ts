export const normalizeForStableJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeForStableJson)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => {
          if (left < right) {
            return -1
          }

          if (left > right) {
            return 1
          }

          return 0
        })
        .map(([key, nestedValue]) => [key, normalizeForStableJson(nestedValue)])
    )
  }

  return value
}
