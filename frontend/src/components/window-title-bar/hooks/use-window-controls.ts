import { useCallback, useEffect, useState } from 'react'
import { getNoteStackWindowControls } from '../utils/get-notestack-window-controls.util'

export const useWindowControls = () => {
  const [windowControls] = useState(getNoteStackWindowControls)
  const [isMaximized, setIsMaximized] = useState(false)

  const close = useCallback(() => {
    void windowControls?.close().catch(() => undefined)
  }, [windowControls])

  const minimize = useCallback(() => {
    void windowControls?.minimize().catch(() => undefined)
  }, [windowControls])

  const toggleMaximize = useCallback(() => {
    void windowControls?.toggleMaximize().catch(() => undefined)
  }, [windowControls])

  useEffect(() => {
    if (!windowControls) {
      return
    }

    let active = true
    let receivedStateChange = false
    const unsubscribe = windowControls.subscribe((state) => {
      receivedStateChange = true

      if (active) {
        setIsMaximized(state.isMaximized)
      }
    })

    void windowControls
      .getState()
      .then((state) => {
        if (active && !receivedStateChange) {
          setIsMaximized(state.isMaximized)
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
      unsubscribe()
    }
  }, [windowControls])

  return {
    close,
    isMaximized,
    minimize,
    toggleMaximize,
  }
}
