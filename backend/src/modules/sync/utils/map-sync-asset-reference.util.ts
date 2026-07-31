import { getImageExtension } from '../../assets/utils/get-image-extension.util'
import { syncLogicalKeys } from '../constants/sync-logical-keys'
import type { AssetReference } from '../types/asset-reference'
import type { MappedSyncAsset } from '../types/mapped-sync-asset'
import { isAssetReferenceValid } from './is-asset-reference-valid.util'

export const mapSyncAssetReference = (
  reference: AssetReference
): MappedSyncAsset => {
  const extension = getImageExtension(reference.mimeType)

  if (!isAssetReferenceValid(reference) || extension === null) {
    throw new Error('Cannot map an invalid synchronized asset reference.')
  }

  return {
    logicalKey: syncLogicalKeys.asset(reference.assetId, extension),
    contentHash: reference.assetId,
    reference: { ...reference },
  }
}
