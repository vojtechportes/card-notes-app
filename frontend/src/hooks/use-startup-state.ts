import { useCallback, useEffect, useState } from 'react'
import type { StartupState } from '../types/startup-state'
import { getMissingStartupBridgeState } from './utils/get-missing-startup-bridge-state.util'

interface StartupStateController {
  exit: () => void
  openBackendLog: () => void
  retry: () => void
  state: StartupState
}

const electronInitialState: StartupState = {
  status: 'starting',
  phase: 'initial',
}

export const useStartupState = (): StartupStateController => {
  const [state, setState] = useState<StartupState>(() =>
    window.noteStackStartup
      ? electronInitialState
      : getMissingStartupBridgeState(navigator.userAgent)
  )

  const retry = useCallback(() => {
    void window.noteStackStartup?.retry().catch(() => undefined)
  }, [])

  const openBackendLog = useCallback(() => {
    void window.noteStackStartup?.openBackendLog().catch(() => undefined)
  }, [])

  const exit = useCallback(() => {
    void window.noteStackStartup?.exit().catch(() => undefined)
  }, [])

  useEffect(() => {
    const bridge = window.noteStackStartup

    if (!bridge) {
      setState(getMissingStartupBridgeState(navigator.userAgent))
      return
    }

    let active = true
    let receivedSubscriptionState = false
    const unsubscribe = bridge.subscribe((nextState) => {
      if (!active) {
        return
      }

      receivedSubscriptionState = true
      setState(nextState)
    })

    void bridge
      .getState()
      .then((currentState) => {
        if (active && !receivedSubscriptionState) {
          setState(currentState)
        }
      })
      .catch(() => {
        if (active && !receivedSubscriptionState) {
          setState({
            status: 'failed',
            reason: 'spawn-error',
          })
        }
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return {
    exit,
    openBackendLog,
    retry,
    state,
  }
}
