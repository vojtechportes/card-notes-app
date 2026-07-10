import type {
  CardNotesUpdaterBridge,
  UpdaterState,
} from '../../../../../types/card-notes-updater'
import type { UpdaterActionName } from '../types/updater-action-name'
import { createUnexpectedUpdaterErrorState } from './create-unexpected-updater-error-state.util'

export const runUpdaterAction = async (
  updater: CardNotesUpdaterBridge,
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
