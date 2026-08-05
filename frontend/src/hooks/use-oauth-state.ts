import { useCallback, useEffect, useState } from 'react'
import type { OAuthConnectOptions } from '../types/oauth-connect-options'
import type { OAuthProviderEnum } from '../types/oauth-provider-enum'
import type { OAuthPublicState } from '../types/oauth-public-state'
import { getOAuthBridge } from './utils/get-oauth-bridge.util'

interface OAuthStateController {
  available: boolean
  connect: (options: OAuthConnectOptions) => Promise<OAuthPublicState>
  disconnect: (provider: OAuthProviderEnum) => Promise<OAuthPublicState>
  reconnect: (options: OAuthConnectOptions) => Promise<OAuthPublicState>
  state: OAuthPublicState
}

const unavailableState: OAuthPublicState = {
  account: null,
  diagnosticCode: null,
  errorCode: null,
  provider: null,
  status: 'disconnected',
}

export const useOAuthState = (): OAuthStateController => {
  const [state, setState] = useState<OAuthPublicState>(unavailableState)

  const connect = useCallback(async (options: OAuthConnectOptions) => {
    const nextState = await getOAuthBridge().connect(options)

    setState(nextState)
    return nextState
  }, [])

  const reconnect = useCallback(async (options: OAuthConnectOptions) => {
    const nextState = await getOAuthBridge().reconnect(options)

    setState(nextState)
    return nextState
  }, [])

  const disconnect = useCallback(async (provider: OAuthProviderEnum) => {
    const nextState = await getOAuthBridge().disconnect(provider)

    setState(nextState)
    return nextState
  }, [])

  useEffect(() => {
    const bridge = window.noteStackOAuth

    if (!bridge) {
      return
    }

    let active = true
    const unsubscribe = bridge.subscribe((nextState) => {
      if (active) {
        setState(nextState)
      }
    })

    void bridge.getState().then((nextState) => {
      if (active) {
        setState(nextState)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return {
    available: Boolean(window.noteStackOAuth),
    connect,
    disconnect,
    reconnect,
    state,
  }
}
