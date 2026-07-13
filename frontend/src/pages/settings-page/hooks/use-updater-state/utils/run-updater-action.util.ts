import type {
  NoteStackUpdaterBridge,
  UpdaterState,
} from '../../../../../types/notestack-updater'
import type { UpdaterActionName } from '../types/updater-action-name'
import { createUnexpectedUpdaterErrorState } from './create-unexpected-updater-error-state.util'

export const runUpdaterAction = async (
  updater: NoteStackUpdaterBridge,
  action: UpdaterActionName,
  onStateChange: (state: UpdaterState) => void,
  currentState: UpdaterState,
  errorMessage: string
): Promise<void> => {
  try {
    const result = await updater[action]()

    onStateChange(result.state)
  } catch {
    onStateChange(createUnexpectedUpdaterErrorState(currentState, errorMessage))
  }
}
