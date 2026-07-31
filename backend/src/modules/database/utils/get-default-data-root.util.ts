import { join } from 'node:path'
import { getPlatformDataDirectory } from './get-platform-data-directory.util'

const APP_DIRECTORY_NAME = 'card-notes-app'

export function getDefaultDataRoot(): string {
  if (process.env.CARD_NOTES_DATA_ROOT) {
    return process.env.CARD_NOTES_DATA_ROOT
  }

  const dataDirectory =
    process.env.CARD_NOTES_DATA_DIR ?? getPlatformDataDirectory()

  return join(dataDirectory, APP_DIRECTORY_NAME)
}
