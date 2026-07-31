import { getImageExtension } from '../../assets/utils/get-image-extension.util'
import { ColumnTypeEnum } from '../../settings/types/column-type-enum'
import type { SyncColumnPayload } from '../types/sync-column-payload'
import type { SyncNoteValue } from '../types/sync-note-value'
import { isAssetReferenceValid } from './is-asset-reference-valid.util'

export const isSyncNoteValueValidForColumn = (
  value: SyncNoteValue,
  column: SyncColumnPayload,
  knownLabelIds?: ReadonlySet<string>
): boolean => {
  switch (column.type) {
    case ColumnTypeEnum.Text:
    case ColumnTypeEnum.Link:
      return typeof value === 'string'
    case ColumnTypeEnum.Date:
      return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    case ColumnTypeEnum.Number:
      return typeof value === 'number' && Number.isFinite(value)
    case ColumnTypeEnum.Image:
      if (Array.isArray(value)) {
        return (
          column.config?.isMultiImage === true &&
          value.length > 0 &&
          value.every(
            (item) =>
              isAssetReferenceValid(item) &&
              getImageExtension(item.mimeType) !== null
          )
        )
      }
      return (
        isAssetReferenceValid(value) &&
        getImageExtension(value.mimeType) !== null
      )
    case ColumnTypeEnum.Labels: {
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== 'string')
      ) {
        return false
      }

      const labelIds = value as string[]
      const hasValidCardinality =
        column.config?.allowMultiple === true || labelIds.length <= 1
      const hasUniqueIds = new Set(labelIds).size === labelIds.length
      const hasKnownIds =
        knownLabelIds === undefined ||
        labelIds.every((labelId) => knownLabelIds.has(labelId))

      return hasValidCardinality && hasUniqueIds && hasKnownIds
    }
    default:
      return false
  }
}
