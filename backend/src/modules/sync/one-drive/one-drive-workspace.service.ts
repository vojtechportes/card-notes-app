import { ONE_DRIVE_WORKSPACE_MARKER_NAME } from './constants/one-drive.constants'
import { OneDriveFileService } from './one-drive-file.service'
import type { OneDriveAccountIdentity } from './types/one-drive-account-identity'
import type { OneDriveItem } from './types/one-drive-item'
import type { SyncProviderWorkspace } from '../types/sync-provider-workspace'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'

export class OneDriveWorkspaceService {
  constructor(private readonly fileService: OneDriveFileService) {}

  async getAccountIdentity(): Promise<OneDriveAccountIdentity> {
    const appRoot = await this.fileService.getAppRoot()
    const accountId = appRoot.item.parentReference?.driveId ?? appRoot.item.id

    if (!accountId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive app root does not identify its drive.'
      )
    }

    return { accountId, displayName: null }
  }

  async list(): Promise<SyncProviderWorkspace[]> {
    const appRoot = await this.fileService.getAppRoot()
    const marker = await this.findMarker(appRoot.item.id!)

    if (!marker) {
      return []
    }

    const workspaceId = await this.readMarkerWorkspaceId(marker)

    return [this.createResult(workspaceId)]
  }

  async discover(workspaceId: string): Promise<SyncProviderWorkspace | null> {
    const workspaces = await this.list()

    return (
      workspaces.find(
        (workspace) => workspace.providerWorkspaceId === workspaceId
      ) ?? null
    )
  }

  async create(workspaceId: string): Promise<SyncProviderWorkspace> {
    const appRoot = await this.fileService.getAppRoot()
    const marker = await this.findMarker(appRoot.item.id!)
    if (marker) {
      const existingWorkspaceId = await this.readMarkerWorkspaceId(marker)

      if (existingWorkspaceId === workspaceId) {
        return this.createResult(workspaceId)
      }

      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        'OneDrive contains a different NoteStack workspace.'
      )
    }

    try {
      await this.fileService.createFile(
        appRoot.item.id!,
        ONE_DRIVE_WORKSPACE_MARKER_NAME,
        Buffer.from(JSON.stringify({ workspaceId }), 'utf8'),
        'application/json'
      )
    } catch (error) {
      if (
        !(error instanceof SyncProviderError) ||
        error.kind !== SyncProviderErrorKindEnum.PreconditionFailed
      ) {
        throw error
      }

      const concurrent = await this.discover(workspaceId)
      if (concurrent) {
        return concurrent
      }

      throw error
    }

    return this.createResult(workspaceId)
  }

  async getAppRootId(): Promise<string> {
    const appRoot = await this.fileService.getAppRoot()

    return appRoot.item.id!
  }

  private async findMarker(parentId: string): Promise<OneDriveItem | null> {
    let nextLink: string | undefined

    do {
      const page = await this.fileService.listChildren(parentId, nextLink)
      const marker = page.value?.find(
        (item) => !item.deleted && item.name === ONE_DRIVE_WORKSPACE_MARKER_NAME
      )
      if (marker) {
        if (!marker.id || !marker.eTag) {
          throw new SyncProviderError(
            SyncProviderErrorKindEnum.Permanent,
            'OneDrive returned an invalid NoteStack workspace marker.'
          )
        }

        return marker
      }

      nextLink = page['@odata.nextLink']
    } while (nextLink)

    return null
  }

  private async readMarkerWorkspaceId(marker: OneDriveItem): Promise<string> {
    const content = await this.fileService.downloadItem(marker.id!, marker.eTag)

    try {
      const value = JSON.parse(content.bytes.toString('utf8')) as {
        workspaceId?: unknown
      }

      if (typeof value.workspaceId === 'string' && value.workspaceId) {
        return value.workspaceId
      }
    } catch {
      // The stable provider error below intentionally hides remote content.
    }

    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'OneDrive contains a corrupt NoteStack workspace marker.'
    )
  }

  private createResult(workspaceId: string): SyncProviderWorkspace {
    return {
      providerWorkspaceId: workspaceId,
      displayName: `NoteStack OneDrive workspace ${workspaceId}`,
    }
  }
}
