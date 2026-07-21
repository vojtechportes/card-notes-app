import type { DatabaseMigration } from '../database-migration'
import { createAppSchemaMigration } from './001-create-app-schema'
import { addNoteTypesMigration } from './002-add-note-types'
import { addLabelsMigration } from './003-add-labels'

export const databaseMigrations: DatabaseMigration[] = [
  createAppSchemaMigration,
  addNoteTypesMigration,
  addLabelsMigration,
]
