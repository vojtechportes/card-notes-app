import {
  GOOGLE_DRIVE_APP_DATA_FOLDER,
  googleDriveAppPropertyKeys,
  googleDriveAppPropertyRoles,
} from '../constants/google-drive.constants'
import type { SyncEntityKindEnum } from '../../types/sync-entity-kind-enum'
import { createGoogleDriveFileName } from './create-google-drive-file-name.util'

export const createGoogleDriveObjectMetadata = (
  workspaceId: string,
  logicalKey: string,
  entityKind: SyncEntityKindEnum,
  contentHash: string
): Record<string, unknown> => ({
  name: createGoogleDriveFileName(logicalKey),
  parents: [GOOGLE_DRIVE_APP_DATA_FOLDER],
  appProperties: {
    [googleDriveAppPropertyKeys.role]: googleDriveAppPropertyRoles.object,
    [googleDriveAppPropertyKeys.workspaceId]: workspaceId,
    [googleDriveAppPropertyKeys.logicalKey]: logicalKey,
    [googleDriveAppPropertyKeys.entityKind]: entityKind,
    [googleDriveAppPropertyKeys.contentHash]: contentHash,
  },
})
