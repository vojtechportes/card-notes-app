import type { UpdaterState } from '../../../../../types/notestack-updater'

export const createFallbackUpdaterState = (): UpdaterState => {
  return {
    currentVersion: 'Unavailable',
    kind: 'unavailable',
    reason: 'updater-disabled',
  }
}
