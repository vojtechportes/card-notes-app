import {
  GOOGLE_DRIVE_APP_DATA_FOLDER,
  googleDriveAppPropertyKeys,
  googleDriveAppPropertyRoles,
} from './constants/google-drive.constants'
import { GoogleDriveFileService } from './google-drive-file.service'
import type { GoogleDriveFile } from './types/google-drive-file'
import type { SyncProviderWorkspace } from '../types/sync-provider-workspace'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'

export class GoogleDriveWorkspaceService {
  constructor(private readonly fileService: GoogleDriveFileService) {}

  async discover(workspaceId: string): Promise<SyncProviderWorkspace | null> {
    const markers = await this.listMarkers()
    const marker = markers.find(
      (file) =>
        file.appProperties?.[googleDriveAppPropertyKeys.workspaceId] ===
        workspaceId
    )

    return marker ? this.createResult(workspaceId) : null
  }

  async create(workspaceId: string): Promise<SyncProviderWorkspace> {
    const markers = await this.listMarkers()
    const existingWorkspaceIds = new Set(
      markers
        .map(
          (file) => file.appProperties?.[googleDriveAppPropertyKeys.workspaceId]
        )
        .filter((value): value is string => Boolean(value))
    )

    if (existingWorkspaceIds.has(workspaceId)) {
      return this.createResult(workspaceId)
    }
    if (existingWorkspaceIds.size > 0) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        'Google Drive contains a different NoteStack workspace.'
      )
    }

    await this.fileService.createMetadata({
      name: `notestack-workspace-${workspaceId}`,
      mimeType: 'application/vnd.notestack.workspace',
      parents: [GOOGLE_DRIVE_APP_DATA_FOLDER],
      appProperties: {
        [googleDriveAppPropertyKeys.role]:
          googleDriveAppPropertyRoles.workspaceMarker,
        [googleDriveAppPropertyKeys.workspaceId]: workspaceId,
      },
    })

    return this.createResult(workspaceId)
  }

  private async listMarkers(): Promise<GoogleDriveFile[]> {
    const role = googleDriveAppPropertyKeys.role
    const query = [
      'trashed = false',
      `appProperties has { key='${role}' and value='${googleDriveAppPropertyRoles.workspaceMarker}' }`,
    ].join(' and ')
    const markers: GoogleDriveFile[] = []
    let pageToken: string | undefined

    do {
      const page = await this.fileService.listFiles(query, pageToken)
      markers.push(...(page.files ?? []).filter((file) => !file.trashed))
      pageToken = page.nextPageToken
    } while (pageToken)

    return markers
  }

  private createResult(workspaceId: string): SyncProviderWorkspace {
    return {
      providerWorkspaceId: workspaceId,
      displayName: 'NoteStack Google Drive workspace',
    }
  }
}
