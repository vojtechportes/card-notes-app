import type { DatabaseMigration } from '../database-migration'
import { createAppSchemaMigration } from './001-create-app-schema'
import { addNoteTypesMigration } from './002-add-note-types'
import { addLabelsMigration } from './003-add-labels'
import { addDetailColumnVisibilityMigration } from './004-add-detail-column-visibility'
import { addNoteBackgroundMigration } from './005-add-note-background'
import { addSyncMetadataMigration } from './006-add-sync-metadata'
import { addManagedAssetsMigration } from './007-add-managed-assets'

export const databaseMigrations: DatabaseMigration[] = [
  createAppSchemaMigration,
  addNoteTypesMigration,
  addLabelsMigration,
  addDetailColumnVisibilityMigration,
  addNoteBackgroundMigration,
  addSyncMetadataMigration,
  addManagedAssetsMigration,
]
