import type {
  UpdaterRelease,
  UpdaterState,
} from '../../../../../types/notestack-updater'

export const getUpdateFromUpdaterState = (
  state: UpdaterState
): UpdaterRelease | null => {
  switch (state.kind) {
    case 'available':
    case 'downloaded':
    case 'downloading':
    case 'installing':
      return state.update
    case 'error':
      return state.update
    default:
      return null
  }
}
