import type { DatabaseMigration } from '../database-migration'
import { createAppSchemaMigration } from './001-create-app-schema'
import { addNoteTypesMigration } from './002-add-note-types'

export const databaseMigrations: DatabaseMigration[] = [
  createAppSchemaMigration,
  addNoteTypesMigration,
]
