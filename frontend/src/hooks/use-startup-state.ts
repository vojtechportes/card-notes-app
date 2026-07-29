import { useCallback, useEffect, useState } from 'react'
import type { StartupState } from '../types/startup-state'
import { setApiClientBaseUrl } from '../utils/set-api-client-base-url.util'
import { getMissingStartupBridgeState } from './utils/get-missing-startup-bridge-state.util'
import { isNoteStackElectronRuntime } from './utils/is-note-stack-electron-runtime.util'

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
      : getMissingStartupBridgeState(
          isNoteStackElectronRuntime(window.location.search)
        )
  )

  const applyState = useCallback((nextState: StartupState) => {
    if (nextState.status === 'ready') {
      setApiClientBaseUrl(nextState.apiBaseUrl)
    }

    setState(nextState)
  }, [])

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
      setState(
        getMissingStartupBridgeState(
          isNoteStackElectronRuntime(window.location.search)
        )
      )
      return
    }

    let active = true
    let receivedSubscriptionState = false
    const unsubscribe = bridge.subscribe((nextState) => {
      if (!active) {
        return
      }

      receivedSubscriptionState = true
      applyState(nextState)
    })

    void bridge
      .getState()
      .then((currentState) => {
        if (active && !receivedSubscriptionState) {
          applyState(currentState)
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
  }, [applyState])

  return {
    exit,
    openBackendLog,
    retry,
    state,
  }
}
