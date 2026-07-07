import type { Database } from 'better-sqlite3';

export interface DatabaseMigration {
  id: string;
  up: (database: Database) => void;
}
