export const compareOneDriveItemId = (
  left: { id?: string },
  right: { id?: string }
): number => {
  const leftId = left.id ?? ''
  const rightId = right.id ?? ''

  if (leftId < rightId) {
    return -1
  }
  if (leftId > rightId) {
    return 1
  }

  return 0
}
