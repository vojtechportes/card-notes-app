export const createGoogleDriveUrl = (
  baseUrl: string,
  path: string,
  parameters: Record<string, string | undefined> = {}
): string => {
  const url = new URL(`${baseUrl}${path}`)

  for (const [name, value] of Object.entries(parameters)) {
    if (value !== undefined) {
      url.searchParams.set(name, value)
    }
  }

  return url.toString()
}
