import { join } from 'node:path'
import { homedir } from 'node:os'

const APP_DIRECTORY_NAME = 'card-notes-app'
const DATABASE_FILE_NAME = 'card-notes.sqlite'

export function getDefaultDatabasePath(): string {
  const dataDirectory =
    process.env.CARD_NOTES_DATA_DIR ?? getPlatformDataDirectory()

  return join(dataDirectory, APP_DIRECTORY_NAME, DATABASE_FILE_NAME)
}

function getPlatformDataDirectory(): string {
  if (process.platform === 'win32' && process.env.APPDATA) {
    return process.env.APPDATA
  }

  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support')
  }

  return process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share')
}
