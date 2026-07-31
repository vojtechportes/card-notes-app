import { homedir } from 'node:os'
import { join } from 'node:path'

export function getPlatformDataDirectory(): string {
  if (process.platform === 'win32' && process.env.APPDATA) {
    return process.env.APPDATA
  }

  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support')
  }

  return process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share')
}
