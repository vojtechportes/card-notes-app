import { join } from 'node:path'
import { getDefaultDataRoot } from './get-default-data-root.util'

const DATABASE_FILE_NAME = 'card-notes.sqlite'

export function getDefaultDatabasePath(): string {
  return join(getDefaultDataRoot(), DATABASE_FILE_NAME)
}
