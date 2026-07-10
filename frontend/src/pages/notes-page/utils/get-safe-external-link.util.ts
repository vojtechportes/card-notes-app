export const getSafeExternalLink = (value: string): string | undefined => {
  const normalizedValue = value.trim()

  if (normalizedValue.length === 0) {
    return undefined
  }

  try {
    const parsedUrl = new URL(normalizedValue)

    if (
      parsedUrl.protocol !== 'http:' &&
      parsedUrl.protocol !== 'https:' &&
      parsedUrl.protocol !== 'mailto:'
    ) {
      return undefined
    }

    return parsedUrl.toString()
  } catch {
    return undefined
  }
}
