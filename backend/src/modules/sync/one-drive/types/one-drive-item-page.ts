import type { OneDriveItem } from './one-drive-item'

export interface OneDriveItemPage {
  value?: OneDriveItem[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}
