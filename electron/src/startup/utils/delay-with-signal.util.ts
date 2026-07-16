export const delayWithSignal = (
  timeoutMs: number,
  signal: AbortSignal
): Promise<void> => {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }

    const handleAbort = () => {
      clearTimeout(timeout)
      resolve()
    }
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, timeoutMs)

    signal.addEventListener('abort', handleAbort, { once: true })
  })
}
