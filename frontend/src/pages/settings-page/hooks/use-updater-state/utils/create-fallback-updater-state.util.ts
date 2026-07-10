import type { UpdaterState } from '../../../../../types/card-notes-updater'

export const createFallbackUpdaterState = (): UpdaterState => {
  return {
    currentVersion: 'Unavailable',
    kind: 'unavailable',
    reason: 'updater-disabled',
  }
}
