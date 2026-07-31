import type { AssetReference } from '../types/asset-reference'

export const isAssetReference = (value: unknown): value is AssetReference => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const reference = value as Partial<AssetReference>

  return (
    typeof reference.assetId === 'string' &&
    /^[a-f0-9]{64}$/.test(reference.assetId) &&
    typeof reference.fileName === 'string' &&
    reference.fileName.length > 0 &&
    typeof reference.mimeType === 'string' &&
    reference.mimeType.startsWith('image/') &&
    Number.isInteger(reference.size) &&
    (reference.size as number) > 0
  )
}
