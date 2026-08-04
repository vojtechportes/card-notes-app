import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common'
import DatabaseConstructor, { type Database } from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseBackupService } from './database-backup.service'
import { databaseMigrations } from './migrations'
import { DATABASE_OPTIONS, type DatabaseOptions } from './database-options'
import type { DatabaseMigration } from './database-migration'

interface MigrationRow {
  id: string
}

const PHASE_10_BACKUP_NAME = 'before-phase-10'

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private database?: Database
  private databaseExistedBeforeInitialization = false

  constructor(
    @Inject(DATABASE_OPTIONS)
    private readonly options: DatabaseOptions,
    @Optional()
    private readonly backupService: DatabaseBackupService = new DatabaseBackupService()
  ) {}

  onModuleInit(): void {
    this.initialize()
  }

  onModuleDestroy(): void {
    this.close()
  }

  initialize(): void {
    this.databaseExistedBeforeInitialization =
      this.options.filePath !== ':memory:' && existsSync(this.options.filePath)
    const database = this.getConnection()

    database.pragma('foreign_keys = ON')
    database.pragma('journal_mode = WAL')
    this.ensureMigrationsTable(database)

    const pendingMigrations = this.getPendingMigrations(database)
    this.createRequiredBackup(database, pendingMigrations)
    this.runPendingMigrations(database, pendingMigrations)
  }

  getConnection(): Database {
    if (!this.database) {
      this.ensureDatabaseDirectory()
      this.database = new DatabaseConstructor(this.options.filePath)
    }

    return this.database
  }

  close(): void {
    if (!this.database) {
      return
    }

    this.database.close()
    this.database = undefined
  }

  createVerifiedBackup(backupName: string): string | null {
    return this.backupService.createVerifiedBackup(
      this.getConnection(),
      this.options.filePath,
      backupName
    )
  }

  restoreVerifiedBackup(backupPath: string): void {
    this.close()
    this.backupService.restoreVerifiedBackup(backupPath, this.options.filePath)
    this.initialize()
  }

  private ensureDatabaseDirectory(): void {
    if (this.options.filePath === ':memory:') {
      return
    }

    mkdirSync(dirname(this.options.filePath), { recursive: true })
  }

  private ensureMigrationsTable(database: Database): void {
    database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  private getPendingMigrations(database: Database): DatabaseMigration[] {
    const appliedMigrationIds = new Set(
      database
        .prepare('SELECT id FROM schema_migrations')
        .all()
        .map((row) => (row as MigrationRow).id)
    )

    return databaseMigrations.filter(
      (migration) => !appliedMigrationIds.has(migration.id)
    )
  }

  private createRequiredBackup(
    database: Database,
    pendingMigrations: DatabaseMigration[]
  ): void {
    if (
      !this.databaseExistedBeforeInitialization ||
      !pendingMigrations.some((migration) => migration.requiresBackup)
    ) {
      return
    }

    this.backupService.createVerifiedBackup(
      database,
      this.options.filePath,
      PHASE_10_BACKUP_NAME
    )
  }

  private runPendingMigrations(
    database: Database,
    pendingMigrations: DatabaseMigration[]
  ): void {
    const applyMigration = database.transaction(
      (migration: DatabaseMigration) => {
        migration.up(database)
        database
          .prepare('INSERT INTO schema_migrations (id) VALUES (?)')
          .run(migration.id)
      }
    )

    for (const migration of pendingMigrations) {
      applyMigration(migration)
    }
  }
}
