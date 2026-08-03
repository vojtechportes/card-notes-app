import type { GoogleDriveFile } from './google-drive-file'

export interface GoogleDriveVersionedFile {
  file: GoogleDriveFile
  providerVersion: string
}
