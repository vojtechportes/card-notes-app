export interface GoogleDriveFile {
  id?: string
  name?: string
  mimeType?: string
  size?: string
  version?: string
  trashed?: boolean
  appProperties?: Record<string, string>
}
