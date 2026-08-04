export const getOneDriveAssetHash = (logicalKey: string): string | null => {
  if (!logicalKey.startsWith('assets/')) {
    return null
  }

  const name = logicalKey.slice('assets/'.length)
  const separator = name.indexOf('.')
  const hash = separator < 0 ? name : name.slice(0, separator)

  return /^[a-f0-9]{64}$/i.test(hash) ? hash.toLowerCase() : null
}
