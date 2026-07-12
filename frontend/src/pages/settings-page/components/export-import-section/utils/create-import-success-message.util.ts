import type { TFunction } from 'i18next'
import type { ImportResultDto } from '../../../../../types/api'

export const createImportSuccessMessage = (
  t: TFunction,
  result: ImportResultDto
) => {
  const generalSettingsStatus = result.updatedGeneralSettings
    ? t('settings.exportImport.status.generalSettingsUpdated')
    : t('settings.exportImport.status.generalSettingsUnchanged')

  return t('settings.exportImport.status.imported', {
    generalSettingsStatus,
    importedColumns: result.importedColumns,
    importedNotes: result.importedNotes,
  })
}
