export const normalizeImageSource = (path: string): string => {
  if (path.startsWith('file://')) {
    return path
  }

  if (/^[A-Za-z]:\\/.test(path)) {
    return `file:///${path.replace(/\\/g, '/')}`
  }

  if (path.startsWith('/')) {
    return `file://${path}`
  }

  return path
}
