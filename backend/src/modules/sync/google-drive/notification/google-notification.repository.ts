import { Inject, Injectable } from '@nestjs/common'
import type { Database } from 'better-sqlite3'
import { DatabaseService } from '../../../database/database.service'
import { syncLogicalKeys } from '../../constants/sync-logical-keys'
import { SyncNotificationStateEnum } from '../../types/sync-notification-state-enum'
import { SyncProviderEnum } from '../../types/sync-provider-enum'
import type { WorkspaceDocument } from '../../types/workspace-document'
import { isWorkspaceDocumentValid } from '../../utils/is-workspace-document-valid.util'
import type { GoogleNotificationContext } from './types/google-notification-context'
import type { GoogleNotificationMetadata } from './types/google-notification-metadata'
import { isGoogleNotificationMetadata } from './utils/is-google-notification-metadata.util'

interface GoogleNotificationContextRow {
  workspace_id: string
  device_id: string
  cursor: string
  workspace_document_json: string
  notification_metadata_json: string | null
}

@Injectable()
export class GoogleNotificationRepository {
  constructor(
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  getContext(): GoogleNotificationContext | null {
    const row = this.getDatabase()
      .prepare(
        `SELECT i.workspace_id, i.device_id, c.cursor,
          r.merge_base_json AS workspace_document_json,
          c.notification_metadata_json
        FROM sync_identity i
        INNER JOIN sync_account_state a ON a.id = 1
        INNER JOIN sync_provider_cursors c
          ON c.workspace_id = i.workspace_id AND c.provider = a.active_provider
        INNER JOIN sync_remote_objects r
          ON r.workspace_id = i.workspace_id AND r.provider = a.active_provider
          AND r.logical_key = ?
        WHERE i.id = 1 AND a.is_enabled = 1
          AND a.active_provider = ? AND a.provider_workspace_id IS NOT NULL
          AND c.cursor IS NOT NULL AND c.is_invalidated = 0`
      )
      .get(syncLogicalKeys.workspace, SyncProviderEnum.GoogleDrive) as
      GoogleNotificationContextRow | undefined

    if (!row) {
      return null
    }

    const workspaceDocument = this.parseWorkspaceDocument(
      row.workspace_document_json
    )

    if (!workspaceDocument) {
      return null
    }

    return {
      workspaceId: row.workspace_id,
      deviceId: row.device_id,
      cursor: row.cursor,
      routing: { ...workspaceDocument.notificationRouting },
      metadata: this.parseMetadata(row.notification_metadata_json),
    }
  }

  saveHealthyState(metadata: GoogleNotificationMetadata): void {
    this.saveState(SyncNotificationStateEnum.Healthy, metadata)
  }

  saveDegradedState(metadata: GoogleNotificationMetadata | null): void {
    this.saveState(SyncNotificationStateEnum.Degraded, metadata)
  }

  saveExpiredState(metadata: GoogleNotificationMetadata | null): void {
    this.saveState(SyncNotificationStateEnum.Expired, metadata)
  }

  private saveState(
    state: SyncNotificationStateEnum,
    metadata: GoogleNotificationMetadata | null
  ): void {
    const context = this.getContext()

    if (!context) {
      return
    }

    this.getDatabase()
      .prepare(
        `UPDATE sync_provider_cursors SET notification_state = ?,
          notification_metadata_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = ? AND provider = ?`
      )
      .run(
        state,
        metadata ? JSON.stringify(metadata) : null,
        context.workspaceId,
        SyncProviderEnum.GoogleDrive
      )
  }

  private parseWorkspaceDocument(json: string): WorkspaceDocument | null {
    try {
      const value = JSON.parse(json) as unknown

      return isWorkspaceDocumentValid(value) ? value : null
    } catch {
      return null
    }
  }

  private parseMetadata(
    json: string | null
  ): GoogleNotificationMetadata | null {
    if (!json) {
      return null
    }

    try {
      const value = JSON.parse(json) as unknown

      return isGoogleNotificationMetadata(value) ? value : null
    } catch {
      return null
    }
  }

  private getDatabase(): Database {
    return this.databaseService.getConnection()
  }
}
