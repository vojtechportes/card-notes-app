import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import DatabaseConstructor, { type Database } from 'better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { databaseMigrations } from './migrations';
import { DATABASE_OPTIONS, type DatabaseOptions } from './database-options';
import type { DatabaseMigration } from './database-migration';

interface MigrationRow {
  id: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private database?: Database;

  constructor(
    @Inject(DATABASE_OPTIONS)
    private readonly options: DatabaseOptions,
  ) {}

  onModuleInit(): void {
    this.initialize();
  }

  onModuleDestroy(): void {
    this.close();
  }

  initialize(): void {
    const database = this.getConnection();

    database.pragma('foreign_keys = ON');
    database.pragma('journal_mode = WAL');
    this.ensureMigrationsTable(database);
    this.runPendingMigrations(database);
  }

  getConnection(): Database {
    if (!this.database) {
      this.ensureDatabaseDirectory();
      this.database = new DatabaseConstructor(this.options.filePath);
    }

    return this.database;
  }

  close(): void {
    if (!this.database) {
      return;
    }

    this.database.close();
    this.database = undefined;
  }

  private ensureDatabaseDirectory(): void {
    if (this.options.filePath === ':memory:') {
      return;
    }

    mkdirSync(dirname(this.options.filePath), { recursive: true });
  }

  private ensureMigrationsTable(database: Database): void {
    database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private runPendingMigrations(database: Database): void {
    const appliedMigrationIds = new Set(
      database.prepare('SELECT id FROM schema_migrations').all().map((row) => (row as MigrationRow).id),
    );

    const applyMigration = database.transaction((migration: DatabaseMigration) => {
      migration.up(database);
      database.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(migration.id);
    });

    for (const migration of databaseMigrations) {
      if (!appliedMigrationIds.has(migration.id)) {
        applyMigration(migration);
      }
    }
  }
}
