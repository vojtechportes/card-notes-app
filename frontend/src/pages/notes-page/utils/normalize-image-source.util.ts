export const normalizeImageSource = (path: string): string | undefined => {
  const normalizedPath = path.trim()

  if (normalizedPath.length === 0) {
    return undefined
  }

  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(normalizedPath)) {
    return normalizedPath
  }

  if (normalizedPath.startsWith('file://')) {
    return normalizedPath
  }

  if (/^[A-Za-z]:\\/.test(normalizedPath)) {
    return `file:///${normalizedPath.replace(/\\/g, '/')}`
  }

  if (normalizedPath.startsWith('/')) {
    return `file://${normalizedPath}`
  }

  return undefined
}
