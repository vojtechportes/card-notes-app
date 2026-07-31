import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { v4 as uuidV4 } from 'uuid'
import { DatabaseService } from '../database/database.service'
import type { SaveSyncConflictInput } from './types/save-sync-conflict-input'
import type { SyncConflictRecord } from './types/sync-conflict-record'
import { SyncConflictResolutionStateEnum } from './types/sync-conflict-resolution-state-enum'
import { stableStringify } from './utils/stable-stringify.util'

interface SyncConflictRow {
  id: string
  workspace_id: string
  entity_kind: SyncConflictRecord['entityKind']
  entity_id: string | null
  conflict_type: SyncConflictRecord['conflictType']
  field_paths_json: string | null
  base_hash: string | null
  local_hash: string | null
  remote_hash: string | null
  base_document_json: string | null
  local_document_json: string | null
  remote_document_json: string | null
  resolution_state: SyncConflictRecord['resolutionState']
  conflict_copy_entity_id: string | null
  created_at: string
  resolved_at: string | null
}

@Injectable()
export class SyncConflictRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  save(input: SaveSyncConflictInput): SyncConflictRecord {
    const database = this.getDatabase()
    const conflict = input.conflict
    const fieldPathsJson = stableStringify([...conflict.fieldPaths].sort())
    const baseHash = this.getDocumentHash(conflict.baseDocument)
    const localHash = this.getDocumentHash(conflict.localDocument)
    const remoteHash = this.getDocumentHash(conflict.remoteDocument)
    const existing = database
      .prepare(
        `SELECT * FROM sync_conflicts
        WHERE workspace_id = @workspaceId AND entity_kind = @entityKind
          AND entity_id IS @entityId AND conflict_type = @conflictType
          AND field_paths_json = @fieldPathsJson
          AND base_hash IS @baseHash AND local_hash IS @localHash
          AND remote_hash IS @remoteHash AND resolution_state = 'unresolved'
        ORDER BY created_at LIMIT 1`
      )
      .get({
        workspaceId: input.workspaceId,
        entityKind: conflict.entityKind,
        entityId: conflict.entityId,
        conflictType: conflict.conflictType,
        fieldPathsJson,
        baseHash,
        localHash,
        remoteHash,
      }) as SyncConflictRow | undefined

    if (existing) {
      return this.mapRow(existing)
    }

    const id = uuidV4()
    const now = new Date().toISOString()

    database
      .prepare(
        `INSERT INTO sync_conflicts (
          id, workspace_id, entity_kind, entity_id, conflict_type,
          field_paths_json, base_hash, local_hash, remote_hash,
          base_document_json, local_document_json, remote_document_json,
          resolution_state, conflict_copy_entity_id, created_at
        ) VALUES (
          @id, @workspaceId, @entityKind, @entityId, @conflictType,
          @fieldPathsJson, @baseHash, @localHash, @remoteHash,
          @baseDocumentJson, @localDocumentJson, @remoteDocumentJson,
          'unresolved', @conflictCopyEntityId, @now
        )`
      )
      .run({
        id,
        workspaceId: input.workspaceId,
        entityKind: conflict.entityKind,
        entityId: conflict.entityId,
        conflictType: conflict.conflictType,
        fieldPathsJson,
        baseHash,
        localHash,
        remoteHash,
        baseDocumentJson: this.stringifyDocument(conflict.baseDocument),
        localDocumentJson: this.stringifyDocument(conflict.localDocument),
        remoteDocumentJson: this.stringifyDocument(conflict.remoteDocument),
        conflictCopyEntityId: input.conflictCopyEntityId ?? null,
        now,
      })

    return this.findById(id)!
  }

  findById(conflictId: string): SyncConflictRecord | null {
    const row = this.getDatabase()
      .prepare('SELECT * FROM sync_conflicts WHERE id = ?')
      .get(conflictId) as SyncConflictRow | undefined

    return row ? this.mapRow(row) : null
  }

  listUnresolved(workspaceId: string): SyncConflictRecord[] {
    const rows = this.getDatabase()
      .prepare(
        `SELECT * FROM sync_conflicts
        WHERE workspace_id = ? AND resolution_state = 'unresolved'
        ORDER BY created_at, id`
      )
      .all(workspaceId) as SyncConflictRow[]

    return rows.map((row) => this.mapRow(row))
  }

  markResolved(
    conflictId: string,
    resolutionState: Exclude<
      SyncConflictResolutionStateEnum,
      SyncConflictResolutionStateEnum.Unresolved
    >
  ): SyncConflictRecord | null {
    this.getDatabase()
      .prepare(
        `UPDATE sync_conflicts SET resolution_state = @resolutionState,
          resolved_at = COALESCE(resolved_at, @resolvedAt)
        WHERE id = @conflictId AND resolution_state = 'unresolved'`
      )
      .run({
        conflictId,
        resolutionState,
        resolvedAt: new Date().toISOString(),
      })

    return this.findById(conflictId)
  }

  private stringifyDocument(document: unknown): string | null {
    return document === null ? null : stableStringify(document)
  }

  private getDocumentHash(document: unknown): string | null {
    if (
      !document ||
      typeof document !== 'object' ||
      !('contentHash' in document)
    ) {
      return null
    }

    const contentHash = (document as { contentHash?: unknown }).contentHash
    return typeof contentHash === 'string' ? contentHash : null
  }

  private mapRow(row: SyncConflictRow): SyncConflictRecord {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      entityKind: row.entity_kind,
      entityId: row.entity_id,
      conflictType: row.conflict_type,
      fieldPaths: row.field_paths_json
        ? (JSON.parse(row.field_paths_json) as string[])
        : [],
      baseHash: row.base_hash,
      localHash: row.local_hash,
      remoteHash: row.remote_hash,
      baseDocumentJson: row.base_document_json,
      localDocumentJson: row.local_document_json,
      remoteDocumentJson: row.remote_document_json,
      resolutionState: row.resolution_state,
      conflictCopyEntityId: row.conflict_copy_entity_id,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    }
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
