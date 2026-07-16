export const fetchBackendHealth = async (
  url: string,
  attemptSignal: AbortSignal,
  timeoutMs: number,
  fetcher: typeof fetch = fetch
): Promise<boolean> => {
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.any([attemptSignal, AbortSignal.timeout(timeoutMs)]),
    })

    return response.ok
  } catch {
    return false
  }
}
