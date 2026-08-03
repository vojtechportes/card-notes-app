interface BeforeQuitEvent {
  preventDefault: () => void
}

interface SyncQuitHandlerOptions {
  dispose: () => void
  flush: () => Promise<void>
  quit: () => void
}

export const createSyncQuitHandler = ({
  dispose,
  flush,
  quit,
}: SyncQuitHandlerOptions) => {
  let isFlushComplete = false
  let flushPromise: Promise<void> | null = null

  return (event: BeforeQuitEvent): void => {
    if (isFlushComplete) {
      dispose()

      return
    }

    event.preventDefault()
    if (flushPromise) {
      return
    }

    flushPromise = flush().finally(() => {
      isFlushComplete = true
      dispose()
      quit()
    })
  }
}
