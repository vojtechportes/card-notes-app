export interface OneDriveItem {
  id?: string
  name?: string
  size?: number
  eTag?: string
  cTag?: string
  deleted?: Record<string, never>
  file?: {
    mimeType?: string
    hashes?: {
      sha256Hash?: string
    }
  }
  folder?: {
    childCount?: number
  }
  parentReference?: {
    driveId?: string
    id?: string
    path?: string
  }
}
