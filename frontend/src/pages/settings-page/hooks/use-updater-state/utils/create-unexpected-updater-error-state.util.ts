import type { UpdaterState } from '../../../../../types/notestack-updater'
import { getUpdateFromUpdaterState } from './get-update-from-updater-state.util'

export const createUnexpectedUpdaterErrorState = (
  state: UpdaterState,
  message: string
): UpdaterState => {
  return {
    currentVersion: state.currentVersion,
    kind: 'error',
    message,
    update: getUpdateFromUpdaterState(state),
  }
}
