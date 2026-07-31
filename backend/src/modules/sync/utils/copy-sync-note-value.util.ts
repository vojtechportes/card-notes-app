import type { AssetReference } from '../types/asset-reference'
import type { SyncNoteValue } from '../types/sync-note-value'
import { copyAssetReference } from './copy-asset-reference.util'

export const copySyncNoteValue = (value: SyncNoteValue): SyncNoteValue => {
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string')) {
      return [...value] as string[]
    }

    return value.map((item) => copyAssetReference(item as AssetReference))
  }

  if (typeof value === 'object') {
    return copyAssetReference(value)
  }

  return value
}
