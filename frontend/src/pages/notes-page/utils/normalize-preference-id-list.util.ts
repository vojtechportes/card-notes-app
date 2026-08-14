export const normalizePreferenceIdList = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null
  }

  if (value.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
    return null
  }

  return [...new Set(value)]
}
