import type { GoogleDriveFile } from '../types/google-drive-file'

export const compareGoogleDriveFileId = (
  left: GoogleDriveFile,
  right: GoogleDriveFile
): number => {
  const leftId = left.id ?? ''
  const rightId = right.id ?? ''

  if (leftId < rightId) {
    return -1
  }
  if (leftId > rightId) {
    return 1
  }

  return 0
}
