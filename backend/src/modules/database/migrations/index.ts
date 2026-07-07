import type { DatabaseMigration } from '../database-migration';
import { createAppSchemaMigration } from './001-create-app-schema';

export const databaseMigrations: DatabaseMigration[] = [createAppSchemaMigration];
