import type { TFunction } from 'i18next'
import type { UpdaterState } from '../../../../../types/notestack-updater'

export const getUpdaterStatusMessage = (
  state: UpdaterState,
  t: TFunction
): string => {
  switch (state.kind) {
    case 'unavailable':
      return t('settings.updater.status.unavailable')
    case 'idle':
      return t('settings.updater.status.idle')
    case 'checking':
      return t('settings.updater.status.checking')
    case 'available':
      return t('settings.updater.status.available', {
        version: state.update.version,
      })
    case 'downloading':
      return t('settings.updater.status.downloading', {
        percent: Math.round(state.progress.percent),
        version: state.update.version,
      })
    case 'downloaded':
      return t('settings.updater.status.downloaded', {
        version: state.update.version,
      })
    case 'installing':
      return t('settings.updater.status.installing', {
        version: state.update.version,
      })
    case 'error':
      return state.message
    default:
      return t('settings.updater.status.idle')
  }
}
