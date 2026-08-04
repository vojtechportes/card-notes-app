import {
  GOOGLE_DRIVE_APP_DATA_FOLDER,
  googleDriveAppPropertyKeys,
  googleDriveAppPropertyRoles,
} from './constants/google-drive.constants'
import { GoogleDriveFileService } from './google-drive-file.service'
import type { GoogleDriveFile } from './types/google-drive-file'
import type { SyncProviderWorkspace } from '../types/sync-provider-workspace'

export class GoogleDriveWorkspaceService {
  constructor(private readonly fileService: GoogleDriveFileService) {}

  async list(): Promise<SyncProviderWorkspace[]> {
    const workspaceIds = new Set(
      (await this.listMarkers())
        .map(
          (file) => file.appProperties?.[googleDriveAppPropertyKeys.workspaceId]
        )
        .filter((value): value is string => Boolean(value))
    )

    return [...workspaceIds]
      .sort()
      .map((workspaceId) => this.createResult(workspaceId))
  }

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
    const existingWorkspaces = await this.list()

    if (
      existingWorkspaces.some(
        (workspace) => workspace.providerWorkspaceId === workspaceId
      )
    ) {
      return this.createResult(workspaceId)
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
