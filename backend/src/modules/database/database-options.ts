import { getDefaultDatabasePath } from './utils/get-default-database-path.util';

export const DATABASE_OPTIONS = 'DATABASE_OPTIONS';

export interface DatabaseOptions {
  filePath: string;
}

export const createDatabaseOptions = (): DatabaseOptions => ({
  filePath: process.env.CARD_NOTES_DATABASE_PATH ?? getDefaultDatabasePath(),
});
