import type { StartupState } from '../../types/startup-state'

export const getMissingStartupBridgeState = (
  userAgent: string
): StartupState => {
  if (userAgent.includes('Electron')) {
    return {
      status: 'failed',
      reason: 'bridge-unavailable',
    }
  }

  return { status: 'ready' }
}
