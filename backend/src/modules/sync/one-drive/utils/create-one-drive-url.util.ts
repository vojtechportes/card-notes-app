export const createOneDriveUrl = (
  pathOrUrl: string,
  query: Record<string, string | undefined> = {}
): string => {
  const url = pathOrUrl.startsWith('https://')
    ? new URL(pathOrUrl)
    : new URL(pathOrUrl, 'https://graph.microsoft.com/v1.0')

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  }

  return url.toString()
}
