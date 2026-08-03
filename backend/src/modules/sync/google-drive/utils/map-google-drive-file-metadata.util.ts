import {
  googleDriveAppPropertyKeys,
  googleDriveAppPropertyRoles,
} from '../constants/google-drive.constants'
import type { GoogleDriveFile } from '../types/google-drive-file'
import { SyncEntityKindEnum } from '../../types/sync-entity-kind-enum'
import { SyncProviderError } from '../../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../../types/sync-provider-error-kind-enum'
import type { SyncProviderObjectMetadata } from '../../types/sync-provider-object-metadata'

const entityKinds = new Set<string>(Object.values(SyncEntityKindEnum))

export const mapGoogleDriveFileMetadata = (
  file: GoogleDriveFile,
  providerVersion: string
): SyncProviderObjectMetadata | null => {
  const properties = file.appProperties
  if (
    properties?.[googleDriveAppPropertyKeys.role] !==
    googleDriveAppPropertyRoles.object
  ) {
    return null
  }

  const logicalKey = properties[googleDriveAppPropertyKeys.logicalKey]
  const entityKind = properties[googleDriveAppPropertyKeys.entityKind]
  const size = Number(file.size ?? '0')

  if (
    !file.id ||
    !logicalKey ||
    !entityKind ||
    !entityKinds.has(entityKind) ||
    !Number.isSafeInteger(size) ||
    size < 0 ||
    !providerVersion
  ) {
    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'Google Drive returned corrupt NoteStack object metadata.'
    )
  }

  const contentHash = properties[googleDriveAppPropertyKeys.contentHash] ?? null

  return {
    logicalKey,
    providerObjectId: file.id,
    providerVersion,
    entityKind: entityKind as SyncEntityKindEnum,
    contentHash,
    size,
    isDeleted: Boolean(file.trashed),
  }
}
