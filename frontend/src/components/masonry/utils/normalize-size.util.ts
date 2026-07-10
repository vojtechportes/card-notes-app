export const normalizeSize = (size: number | string): string => {
  if (typeof size === 'number') {
    return `${size}px`
  }

  return size
}
