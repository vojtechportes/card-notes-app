import type { AssetReference } from '../types/asset-reference'

export const copyAssetReference = (
  reference: AssetReference
): AssetReference => {
  const copy: AssetReference = {
    assetId: reference.assetId,
    fileName: reference.fileName,
    mimeType: reference.mimeType,
    size: reference.size,
  }

  if (reference.width !== undefined) {
    copy.width = reference.width
  }
  if (reference.height !== undefined) {
    copy.height = reference.height
  }
  if (reference.altText !== undefined) {
    copy.altText = reference.altText
  }

  return copy
}
