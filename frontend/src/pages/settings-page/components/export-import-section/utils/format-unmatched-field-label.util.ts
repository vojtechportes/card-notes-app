import type { TFunction } from 'i18next'
import type { ImportUnmatchedFieldDto } from '../../../../../types/api'

export const formatUnmatchedFieldLabel = (
  t: TFunction,
  field: ImportUnmatchedFieldDto
) => {
  if (field.noteTypeTitle || field.title || field.type) {
    return t('settings.exportImport.unmatchedFields.itemDetailed', {
      name: field.name,
      noteTypeTitle:
        field.noteTypeTitle ??
        t('settings.exportImport.unmatchedFields.unknownType'),
      title: field.title ?? field.name,
      type: field.type
        ? t(`settings.columns.types.${field.type}`)
        : t('settings.exportImport.unmatchedFields.unknownFieldType'),
    })
  }

  return t('settings.exportImport.unmatchedFields.itemSimple', {
    name: field.name,
  })
}
