import type { AssetReference } from './asset-reference'

export interface MappedSyncAsset {
  logicalKey: string
  contentHash: string
  reference: AssetReference
}
