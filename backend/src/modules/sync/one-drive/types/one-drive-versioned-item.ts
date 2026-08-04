import type { OneDriveItem } from './one-drive-item'

export interface OneDriveVersionedItem {
  item: OneDriveItem
  providerVersion: string
}
