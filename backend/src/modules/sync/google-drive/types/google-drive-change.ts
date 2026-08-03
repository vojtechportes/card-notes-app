import type { GoogleDriveFile } from './google-drive-file'

export interface GoogleDriveChange {
  fileId?: string
  removed?: boolean
  changeType?: string
  file?: GoogleDriveFile
}
