import type { SyncConfigurationDocument } from '../types/sync-configuration-document'

export const hasValidSyncConfigurationRelationships = (
  document: SyncConfigurationDocument
): boolean => {
  const entities = [
    ...document.payload.noteTypes,
    ...document.payload.columns,
    ...document.payload.labels,
    document.payload.generalSettings,
  ]
  const entityIds = entities.map((entity) => entity.id)

  if (new Set(entityIds).size !== entityIds.length) {
    return false
  }

  const liveNoteTypeIds = new Set(
    document.payload.noteTypes
      .filter((entity) => entity.deletedAt === null)
      .map((entity) => entity.id)
  )
  const columnsValid = document.payload.columns.every(
    (entity) =>
      entity.payload === null || liveNoteTypeIds.has(entity.payload.noteTypeId)
  )
  const labelsValid = document.payload.labels.every(
    (entity) =>
      entity.payload === null ||
      entity.payload.noteTypeId === null ||
      liveNoteTypeIds.has(entity.payload.noteTypeId)
  )

  return columnsValid && labelsValid
}
