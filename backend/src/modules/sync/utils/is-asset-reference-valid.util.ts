import type { AssetReference } from '../types/asset-reference'
import { isRecord } from './is-record.util'
import { isSha256Hash } from './is-sha-256-hash.util'

export const isAssetReferenceValid = (
  value: unknown
): value is AssetReference => {
  if (!isRecord(value)) {
    return false
  }

  return (
    isSha256Hash(value.assetId) &&
    typeof value.fileName === 'string' &&
    value.fileName.length > 0 &&
    !/[\\/]/.test(value.fileName) &&
    typeof value.mimeType === 'string' &&
    value.mimeType.startsWith('image/') &&
    Number.isInteger(value.size) &&
    Number(value.size) >= 0 &&
    (value.width === undefined ||
      (Number.isInteger(value.width) && Number(value.width) > 0)) &&
    (value.height === undefined ||
      (Number.isInteger(value.height) && Number(value.height) > 0)) &&
    (value.altText === undefined || typeof value.altText === 'string')
  )
}
