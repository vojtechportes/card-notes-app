import type { UpdaterState } from '../../updater-contract.js'

export const shouldScheduleBackgroundChecks = (state: UpdaterState): boolean => {
  return state.kind !== 'unavailable'
}
