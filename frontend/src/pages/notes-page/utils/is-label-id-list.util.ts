export const isLabelIdList = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) &&
    value.every((labelId) => typeof labelId === 'string')
  )
}
