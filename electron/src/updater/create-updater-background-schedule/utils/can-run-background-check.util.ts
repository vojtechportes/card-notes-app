import type { UpdaterState } from '../../updater-contract.js'

export const canRunBackgroundCheck = (state: UpdaterState): boolean => {
  return state.kind === 'idle' || state.kind === 'error'
}
