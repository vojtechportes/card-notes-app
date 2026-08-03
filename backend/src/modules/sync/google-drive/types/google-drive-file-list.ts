import type { GoogleDriveFile } from './google-drive-file'

export interface GoogleDriveFileList {
  files?: GoogleDriveFile[]
  nextPageToken?: string
}
