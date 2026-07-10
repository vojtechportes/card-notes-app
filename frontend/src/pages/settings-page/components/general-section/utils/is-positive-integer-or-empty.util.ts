export const isPositiveIntegerOrEmpty = (value: string | undefined) => {
  if (!value?.trim()) {
    return true
  }

  return /^[1-9]\d*$/.test(value.trim())
}
