import type { TFunction } from 'i18next'
import type { UpdaterActionConfig } from '../types/updater-action-config'

export const getUpdaterActionLabel = (
  action: UpdaterActionConfig,
  t: TFunction
): string => {
  switch (action.key) {
    case 'download':
      return t('settings.updater.actions.download')
    case 'install':
      return t('settings.updater.actions.install')
    case 'checking':
      return t('settings.updater.actions.checking')
    case 'downloading':
      return t('settings.updater.actions.downloading')
    case 'installing':
      return t('settings.updater.actions.installing')
    case 'checkDisabled':
      return t('settings.updater.actions.unavailable')
    case 'check':
    default:
      return t('settings.updater.actions.check')
  }
}
