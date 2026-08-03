import { ONE_DRIVE_WORKSPACE_MARKER_NAME } from './constants/one-drive.constants'
import { OneDriveFileService } from './one-drive-file.service'
import type { SyncProviderWorkspace } from '../types/sync-provider-workspace'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'

export class OneDriveWorkspaceService {
  constructor(private readonly fileService: OneDriveFileService) {}

  async discover(workspaceId: string): Promise<SyncProviderWorkspace | null> {
    const appRoot = await this.fileService.getAppRoot()
    const marker = await this.findMarker(appRoot.item.id!)
    if (!marker) {
      return null
    }

    const content = await this.fileService.downloadItem(marker.id!, marker.eTag)
    let storedWorkspaceId: string | undefined
    try {
      const value = JSON.parse(content.bytes.toString('utf8')) as {
        workspaceId?: unknown
      }
      storedWorkspaceId =
        typeof value.workspaceId === 'string' ? value.workspaceId : undefined
    } catch {
      storedWorkspaceId = undefined
    }

    if (!storedWorkspaceId) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive contains a corrupt NoteStack workspace marker.'
      )
    }

    return storedWorkspaceId === workspaceId
      ? this.createResult(workspaceId)
      : null
  }

  async create(workspaceId: string): Promise<SyncProviderWorkspace> {
    const appRoot = await this.fileService.getAppRoot()
    const marker = await this.findMarker(appRoot.item.id!)
    if (marker) {
      const existing = await this.discover(workspaceId)
      if (existing) {
        return existing
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

  private async findMarker(parentId: string) {
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

  private createResult(workspaceId: string): SyncProviderWorkspace {
    return {
      providerWorkspaceId: workspaceId,
      displayName: `NoteStack OneDrive workspace ${workspaceId}`,
    }
  }
}
