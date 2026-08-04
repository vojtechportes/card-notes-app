import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { v4 as uuidV4 } from 'uuid'
import { AssetsRepository } from '../../../../src/modules/assets/assets.repository'
import { AssetsService } from '../../../../src/modules/assets/assets.service'
import { DatabaseService } from '../../../../src/modules/database/database.service'
import { NotesRepository } from '../../../../src/modules/notes/notes.repository'
import { GeneralSettingsRepository } from '../../../../src/modules/settings/general-settings.repository'
import { FakeSyncProviderAdapter } from '../../../../src/modules/sync/fake-provider/fake-sync-provider.adapter'
import { SyncConflictRepository } from '../../../../src/modules/sync/sync-conflict.repository'
import { SyncOutboxRepository } from '../../../../src/modules/sync/sync-outbox.repository'
import { SyncReconciliationRepository } from '../../../../src/modules/sync/sync-reconciliation.repository'
import { SyncReconciliationService } from '../../../../src/modules/sync/sync-reconciliation.service'

export class SyncTestDevice {
  readonly assetsService: AssetsService
  readonly conflicts: SyncConflictRepository
  readonly database: DatabaseService
  readonly generalSettings: GeneralSettingsRepository
  readonly notes: NotesRepository
  readonly outbox: SyncOutboxRepository
  readonly reconciliation: SyncReconciliationRepository

  private readonly claimedBy = uuidV4()
  private readonly dataRoot = mkdtempSync(
    join(tmpdir(), 'notestack-sync-device-')
  )
  private readonly service: SyncReconciliationService

  constructor(source?: SyncTestDevice) {
    const databasePath = join(this.dataRoot, 'card-notes.sqlite')

    if (source) {
      writeFileSync(
        databasePath,
        source.database.getConnection().serialize({ attached: 'main' })
      )
    }

    this.database = new DatabaseService({ filePath: databasePath })
    this.database.initialize()

    const connection = this.database.getConnection()

    if (source) {
      connection
        .prepare('UPDATE sync_identity SET device_id = ? WHERE id = 1')
        .run(uuidV4())
    }

    const identity = connection
      .prepare(
        'SELECT workspace_id AS workspaceId FROM sync_identity WHERE id = 1'
      )
      .get() as { workspaceId: string }

    connection
      .prepare(
        `UPDATE sync_account_state SET is_enabled = 1,
          active_provider = 'google-drive', connection_state = 'connected',
          provider_workspace_id = ? WHERE id = 1`
      )
      .run(identity.workspaceId)

    this.notes = new NotesRepository(this.database)
    this.generalSettings = new GeneralSettingsRepository(this.database)
    this.outbox = new SyncOutboxRepository(this.database)
    this.conflicts = new SyncConflictRepository(this.database)
    this.reconciliation = new SyncReconciliationRepository(
      this.database,
      this.conflicts
    )

    const previousDataRoot = process.env.CARD_NOTES_DATA_ROOT
    process.env.CARD_NOTES_DATA_ROOT = this.dataRoot
    this.assetsService = new AssetsService(new AssetsRepository(this.database))

    if (previousDataRoot === undefined) {
      delete process.env.CARD_NOTES_DATA_ROOT
    } else {
      process.env.CARD_NOTES_DATA_ROOT = previousDataRoot
    }

    this.service = new SyncReconciliationService(
      this.reconciliation,
      this.outbox,
      this.assetsService
    )
  }

  get workspaceId(): string {
    return this.reconciliation.getActiveContext()!.workspaceId
  }

  get defaultNoteTypeId(): string {
    return (
      this.database
        .getConnection()
        .prepare('SELECT id FROM note_types ORDER BY created_at LIMIT 1')
        .get() as { id: string }
    ).id
  }

  async synchronize(
    adapter: FakeSyncProviderAdapter,
    now?: Date
  ): Promise<void> {
    await this.service.run(adapter, { claimedBy: this.claimedBy, now })
  }

  dispose(): void {
    this.database.close()
    rmSync(this.dataRoot, { force: true, recursive: true })
  }
}
