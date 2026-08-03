export const GOOGLE_DRIVE_APP_DATA_SCOPE =
  'https://www.googleapis.com/auth/drive.appdata'
export const GOOGLE_DRIVE_API_BASE_URL = 'https://www.googleapis.com/drive/v3'
export const GOOGLE_DRIVE_UPLOAD_BASE_URL =
  'https://www.googleapis.com/upload/drive/v3'
export const GOOGLE_DRIVE_APP_DATA_FOLDER = 'appDataFolder'
export const GOOGLE_DRIVE_ADAPTER_VERSION = '1'
export const GOOGLE_DRIVE_PAGE_SIZE = 1000
export const GOOGLE_DRIVE_RESUMABLE_CHUNK_SIZE = 256 * 1024
export const GOOGLE_DRIVE_RESUMABLE_THRESHOLD = 5 * 1024 * 1024
export const GOOGLE_DRIVE_MAX_UPLOAD_ATTEMPTS = 3
export const googleDriveAppPropertyKeys = {
  role: 'notestackRole',
  workspaceId: 'notestackWorkspaceId',
  logicalKey: 'notestackLogicalKey',
  entityKind: 'notestackEntityKind',
  contentHash: 'notestackContentHash',
} as const
export const googleDriveAppPropertyRoles = {
  workspaceMarker: 'workspace-marker',
  object: 'object',
} as const
