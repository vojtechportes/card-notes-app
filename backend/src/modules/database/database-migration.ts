import type { Database } from 'better-sqlite3'

export interface DatabaseMigration {
  id: string
  requiresBackup?: boolean
  up: (database: Database) => void
}
