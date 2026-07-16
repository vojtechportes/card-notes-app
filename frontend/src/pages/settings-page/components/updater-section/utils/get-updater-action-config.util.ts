import type { UpdaterState } from '../../../../../types/notestack-updater'
import type { UpdaterActionConfig } from '../types/updater-action-config'

export const getUpdaterActionConfig = (
  isUpdaterAvailable: boolean,
  state: UpdaterState
): UpdaterActionConfig => {
  if (!isUpdaterAvailable || state.kind === 'unavailable') {
    return {
      disabled: true,
      isPending: false,
      key: 'checkDisabled',
    }
  }

  switch (state.kind) {
    case 'checking':
      return {
        disabled: true,
        isPending: true,
        key: 'checking',
      }
    case 'available':
      return {
        disabled: false,
        isPending: false,
        key: 'download',
      }
    case 'downloading':
      return {
        disabled: true,
        isPending: true,
        key: 'downloading',
      }
    case 'downloaded':
      return {
        disabled: false,
        isPending: false,
        key: 'install',
      }
    case 'installing':
      return {
        disabled: true,
        isPending: true,
        key: 'installing',
      }
    case 'idle':
    case 'error':
    default:
      return {
        disabled: false,
        isPending: false,
        key: 'check',
      }
  }
}
