import type { UpdaterState } from '../../../../../types/notestack-updater'

export const isUpdaterPreferenceChangeDisabled = (
  state: UpdaterState
): boolean => {
  switch (state.kind) {
    case 'checking':
    case 'downloaded':
    case 'downloading':
    case 'installing':
    case 'unavailable':
      return true
    default:
      return false
  }
}
