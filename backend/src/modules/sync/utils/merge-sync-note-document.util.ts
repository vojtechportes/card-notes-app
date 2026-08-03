import type { SyncDocumentMergeResult } from '../types/sync-document-merge-result'
import { SyncConflictTypeEnum } from '../types/sync-conflict-type-enum'
import { SyncEntityKindEnum } from '../types/sync-entity-kind-enum'
import type { SyncNoteDocument } from '../types/sync-note-document'
import type { SyncNoteValue } from '../types/sync-note-value'
import { areSyncValuesEqual } from './are-sync-values-equal.util'
import { getSyncDocumentAuthorityKey } from './get-sync-document-authority-key.util'
import { mapSyncDocument } from './map-sync-document.util'
import { mergeThreeWayValue } from './merge-three-way-value.util'
import { selectDeterministicSyncDocument } from './select-deterministic-sync-document.util'

export const mergeSyncNoteDocument = (
  base: SyncNoteDocument | null,
  local: SyncNoteDocument,
  remote: SyncNoteDocument
): SyncDocumentMergeResult => {
  const preferred = selectDeterministicSyncDocument(local, remote)
  const other = preferred === local ? remote : local
  const preferLocal = preferred === local

  if (areSyncValuesEqual(local, remote)) {
    return { document: preferred, conflicts: [] }
  }

  if (base === null) {
    return {
      document: preferred,
      conflicts: [
        {
          conflictType: SyncConflictTypeEnum.UuidCollision,
          entityKind: SyncEntityKindEnum.Note,
          entityId: local.entityId,
          fieldPaths: ['$'],
          baseDocument: null,
          localDocument: local,
          remoteDocument: remote,
          conflictCopyDocument: other,
        },
      ],
    }
  }

  if (base.deletedAt && (!local.deletedAt || !remote.deletedAt)) {
    let tombstone = base
    let staleEdit = preferred

    if (local.deletedAt) {
      tombstone = local
      staleEdit = remote
    } else if (remote.deletedAt) {
      tombstone = remote
      staleEdit = local
    }

    return {
      document: tombstone,
      conflicts: [
        {
          conflictType: SyncConflictTypeEnum.EditDelete,
          entityKind: SyncEntityKindEnum.Note,
          entityId: local.entityId,
          fieldPaths: ['$'],
          baseDocument: base,
          localDocument: local,
          remoteDocument: remote,
          conflictCopyDocument: staleEdit,
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

  if (local.deletedAt || remote.deletedAt) {
    if (local.deletedAt && remote.deletedAt) {
      return { document: preferred, conflicts: [] }
    }

    const tombstone = local.deletedAt ? local : remote
    const edited = local.deletedAt ? remote : local

    return {
      document: tombstone,
      conflicts: [
        {
          conflictType: SyncConflictTypeEnum.EditDelete,
          entityKind: SyncEntityKindEnum.Note,
          entityId: local.entityId,
          fieldPaths: ['$'],
          baseDocument: base,
          localDocument: local,
          remoteDocument: remote,
          conflictCopyDocument: edited,
        },
      ],
    }
  }

  if (!base.payload || !local.payload || !remote.payload) {
    return {
      document: preferred,
      conflicts: [
        {
          conflictType: SyncConflictTypeEnum.EditEdit,
          entityKind: SyncEntityKindEnum.Note,
          entityId: local.entityId,
          fieldPaths: ['$'],
          baseDocument: base,
          localDocument: local,
          remoteDocument: remote,
          conflictCopyDocument: other,
        },
      ],
    }
  }

  const fieldPaths: string[] = []
  const noteTypeId = mergeThreeWayValue(
    base.payload.noteTypeId,
    local.payload.noteTypeId,
    remote.payload.noteTypeId,
    preferLocal
  )
  const background = mergeThreeWayValue(
    base.payload.background,
    local.payload.background,
    remote.payload.background,
    preferLocal
  )

  if (noteTypeId.hasConflict) {
    fieldPaths.push('payload.noteTypeId')
  }
  if (background.hasConflict) {
    fieldPaths.push('payload.background')
  }

  const values: Record<string, SyncNoteValue> = {}
  const valueIds = new Set([
    ...Object.keys(base.payload.values),
    ...Object.keys(local.payload.values),
    ...Object.keys(remote.payload.values),
  ])

  for (const valueId of [...valueIds].sort()) {
    const value = mergeThreeWayValue(
      base.payload.values[valueId],
      local.payload.values[valueId],
      remote.payload.values[valueId],
      preferLocal
    )

    if (value.value !== undefined) {
      values[valueId] = value.value
    }
    if (value.hasConflict) {
      fieldPaths.push(`payload.values.${valueId}`)
    }
  }

  const authority = preferred
  const mapped = mapSyncDocument({
    formatVersion: authority.formatVersion,
    workspaceId: authority.workspaceId,
    parentHash: base.contentHash,
    mutationId: authority.mutationId,
    modifiedBy: authority.modifiedBy,
    modifiedAt: authority.modifiedAt,
    entityType: 'note',
    entityId: authority.entityId,
    deletedAt: null,
    payload: {
      noteTypeId: noteTypeId.value,
      background: background.value,
      values,
    },
  })

  if (fieldPaths.length === 0) {
    return { document: mapped.document, conflicts: [] }
  }

  return {
    document: mapped.document,
    conflicts: [
      {
        conflictType: SyncConflictTypeEnum.EditEdit,
        entityKind: SyncEntityKindEnum.Note,
        entityId: local.entityId,
        fieldPaths,
        baseDocument: base,
        localDocument: local,
        remoteDocument: remote,
        conflictCopyDocument: other,
      },
    ],
  }
}
