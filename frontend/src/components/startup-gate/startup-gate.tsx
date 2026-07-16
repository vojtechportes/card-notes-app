import type { PropsWithChildren } from 'react'
import { useStartupState } from '../../hooks/use-startup-state'
import { StartupScreen } from './startup-screen'

export const StartupGate = ({ children }: PropsWithChildren) => {
  const { exit, openBackendLog, retry, state } = useStartupState()

  if (state.status === 'ready') {
    return children
  }

  return (
    <StartupScreen
      onExit={exit}
      onOpenBackendLog={openBackendLog}
      onRetry={retry}
      state={state}
    />
  )
}
