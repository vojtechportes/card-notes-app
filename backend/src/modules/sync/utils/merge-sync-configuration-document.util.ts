import type { SyncConfigurationDocument } from '../types/sync-configuration-document'
import type { SyncDocumentMergeResult } from '../types/sync-document-merge-result'
import type { SyncMergeConflict } from '../types/sync-merge-conflict'
import { SyncConflictTypeEnum } from '../types/sync-conflict-type-enum'
import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import { areSyncValuesEqual } from './are-sync-values-equal.util'
import { hasValidSyncConfigurationRelationships } from './has-valid-sync-configuration-relationships.util'
import { mapSyncDocument } from './map-sync-document.util'
import { mergeSyncConfigurationEntity } from './merge-sync-configuration-entity.util'
import { mergeSyncConfigurationEntityCollection } from './merge-sync-configuration-entity-collection.util'
import { selectDeterministicSyncDocument } from './select-deterministic-sync-document.util'

export const mergeSyncConfigurationDocument = (
  base: SyncConfigurationDocument | null,
  local: SyncConfigurationDocument,
  remote: SyncConfigurationDocument
): SyncDocumentMergeResult => {
  const preferred = selectDeterministicSyncDocument(local, remote)

  if (areSyncValuesEqual(local, remote)) {
    return { document: preferred, conflicts: [] }
  }

  if (!base) {
    return {
      document: preferred,
      conflicts: [
        {
          conflictType: SyncConflictTypeEnum.UuidCollision,
          entityKind: SyncEntityKindEnum.Configuration,
          entityId: 'configuration',
          fieldPaths: ['$'],
          baseDocument: null,
          localDocument: local,
          remoteDocument: remote,
        },
      ],
    }
  }

  if (areSyncValuesEqual(local, base)) {
    return { document: remote, conflicts: [] }
  }
  if (areSyncValuesEqual(remote, base)) {
    return { document: local, conflicts: [] }
  }

  const noteTypes = mergeSyncConfigurationEntityCollection(
    base.payload.noteTypes,
    local.payload.noteTypes,
    remote.payload.noteTypes,
    'payload.noteTypes'
  )
  const columns = mergeSyncConfigurationEntityCollection(
    base.payload.columns,
    local.payload.columns,
    remote.payload.columns,
    'payload.columns'
  )
  const labels = mergeSyncConfigurationEntityCollection(
    base.payload.labels,
    local.payload.labels,
    remote.payload.labels,
    'payload.labels'
  )
  const generalSettings = mergeSyncConfigurationEntity(
    base.payload.generalSettings,
    local.payload.generalSettings,
    remote.payload.generalSettings,
    'payload.generalSettings'
  )
  const authority = preferred
  const mapped = mapSyncDocument({
    formatVersion: authority.formatVersion,
    workspaceId: authority.workspaceId,
    parentHash: base.contentHash,
    mutationId: authority.mutationId,
    modifiedBy: authority.modifiedBy,
    modifiedAt: authority.modifiedAt,
    entityType: 'configuration',
    entityId: 'configuration',
    payload: {
      noteTypes: noteTypes.entities,
      columns: columns.entities,
      labels: labels.entities,
      generalSettings: generalSettings.entity!,
    },
  })
  const merged = mapped.document as SyncConfigurationDocument
  const conflicts: SyncMergeConflict[] = [
    ...noteTypes.conflicts,
    ...columns.conflicts,
    ...labels.conflicts,
  ].map((conflict) => ({
    conflictType: conflict.conflictType,
    entityKind: SyncEntityKindEnum.Configuration,
    entityId: 'configuration',
    fieldPaths: conflict.fieldPaths,
    baseDocument: base,
    localDocument: local,
    remoteDocument: remote,
  }))

  if (generalSettings.conflictType) {
    conflicts.push({
      conflictType: generalSettings.conflictType,
      entityKind: SyncEntityKindEnum.Configuration,
      entityId: 'configuration',
      fieldPaths: generalSettings.fieldPaths,
      baseDocument: base,
      localDocument: local,
      remoteDocument: remote,
    })
  }

  if (hasValidSyncConfigurationRelationships(merged)) {
    return { document: merged, conflicts }
  }

  let validFallback = preferred

  if (!hasValidSyncConfigurationRelationships(preferred)) {
    validFallback = preferred === local ? remote : local
  }

  return {
    document: validFallback,
    conflicts: [
      ...conflicts,
      {
        conflictType: SyncConflictTypeEnum.InvalidReference,
        entityKind: SyncEntityKindEnum.Configuration,
        entityId: 'configuration',
        fieldPaths: ['$relationships'],
        baseDocument: base,
        localDocument: local,
        remoteDocument: remote,
      },
    ],
  }
}
