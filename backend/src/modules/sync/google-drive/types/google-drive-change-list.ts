import type { GoogleDriveChange } from './google-drive-change'

export interface GoogleDriveChangeList {
  changes?: GoogleDriveChange[]
  nextPageToken?: string
  newStartPageToken?: string
}
