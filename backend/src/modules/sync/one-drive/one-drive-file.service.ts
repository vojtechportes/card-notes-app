import {
  ONE_DRIVE_APP_ROOT_PATH,
  ONE_DRIVE_GRAPH_BASE_URL,
  ONE_DRIVE_MAX_UPLOAD_ATTEMPTS,
  ONE_DRIVE_PAGE_SIZE,
  ONE_DRIVE_RESUMABLE_CHUNK_SIZE,
} from './constants/one-drive.constants'
import { OneDriveHttpClient } from './one-drive-http-client'
import type { OneDriveItem } from './types/one-drive-item'
import type { OneDriveRetryDelay } from './types/one-drive-retry-delay'
import type { OneDriveItemPage } from './types/one-drive-item-page'
import type { OneDriveUploadSession } from './types/one-drive-upload-session'
import type { OneDriveVersionedItem } from './types/one-drive-versioned-item'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'
import { createOneDriveUrl } from './utils/create-one-drive-url.util'
import { delayOneDriveRetry } from './utils/delay-one-drive-retry.util'
import { readOneDriveJson } from './utils/read-one-drive-json.util'

const ITEM_SELECT = 'id,name,size,eTag,cTag,deleted,file,folder,parentReference'

export class OneDriveFileService {
  constructor(
    private readonly httpClient: OneDriveHttpClient,
    private readonly retryDelay: OneDriveRetryDelay = delayOneDriveRetry
  ) {}

  async getAppRoot(): Promise<OneDriveVersionedItem> {
    return this.getItemByUrl(
      createOneDriveUrl(
        `${ONE_DRIVE_GRAPH_BASE_URL}${ONE_DRIVE_APP_ROOT_PATH}`,
        { $select: ITEM_SELECT }
      )
    )
  }

  async getItem(itemId: string): Promise<OneDriveVersionedItem> {
    return this.getItemByUrl(
      createOneDriveUrl(
        `${ONE_DRIVE_GRAPH_BASE_URL}/me/drive/items/${encodeURIComponent(itemId)}`,
        { $select: ITEM_SELECT }
      )
    )
  }

  async listChildren(
    parentId: string,
    nextLink?: string
  ): Promise<OneDriveItemPage> {
    const url =
      nextLink ??
      createOneDriveUrl(
        `${ONE_DRIVE_GRAPH_BASE_URL}/me/drive/items/${encodeURIComponent(parentId)}/children`,
        { $select: ITEM_SELECT, $top: String(ONE_DRIVE_PAGE_SIZE) }
      )
    const response = await this.httpClient.request(url)

    return readOneDriveJson<OneDriveItemPage>(response)
  }

  async listDelta(rootId: string, link?: string): Promise<OneDriveItemPage> {
    const url =
      link ??
      createOneDriveUrl(
        `${ONE_DRIVE_GRAPH_BASE_URL}/me/drive/items/${encodeURIComponent(rootId)}/delta`,
        { $select: ITEM_SELECT, $top: String(ONE_DRIVE_PAGE_SIZE) }
      )
    const response = await this.httpClient.request(url, {}, [], true)

    return readOneDriveJson<OneDriveItemPage>(response)
  }

  async downloadItem(
    itemId: string,
    expectedVersion?: string
  ): Promise<{ bytes: Buffer; contentType: string }> {
    const headers: Record<string, string> = {}
    if (expectedVersion) {
      headers['If-Match'] = expectedVersion
    }

    const response = await this.httpClient.request(
      `${ONE_DRIVE_GRAPH_BASE_URL}/me/drive/items/${encodeURIComponent(itemId)}/content`,
      { headers }
    )

    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType:
        response.headers.get('content-type') ?? 'application/octet-stream',
    }
  }

  async createFile(
    parentId: string,
    name: string,
    bytes: Buffer,
    contentType: string
  ): Promise<OneDriveVersionedItem> {
    const response = await this.httpClient.request(
      this.createPathContentUrl(parentId, name),
      {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'If-None-Match': '*',
        },
        body: bytes,
      }
    )

    return this.readVersionedItem(response)
  }

  async updateFile(
    itemId: string,
    bytes: Buffer,
    contentType: string,
    expectedVersion: string
  ): Promise<OneDriveVersionedItem> {
    const response = await this.httpClient.request(
      `${ONE_DRIVE_GRAPH_BASE_URL}/me/drive/items/${encodeURIComponent(itemId)}/content`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'If-Match': expectedVersion,
        },
        body: bytes,
      }
    )

    return this.readVersionedItem(response)
  }

  async createResumableFile(
    parentId: string,
    name: string,
    bytes: Buffer
  ): Promise<OneDriveVersionedItem> {
    const sessionResponse = await this.httpClient.request(
      `${ONE_DRIVE_GRAPH_BASE_URL}/me/drive/items/${encodeURIComponent(parentId)}:/${encodeURIComponent(name)}:/createUploadSession`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: {
            '@microsoft.graph.conflictBehavior': 'fail',
            name,
          },
        }),
      }
    )
    const session =
      await readOneDriveJson<OneDriveUploadSession>(sessionResponse)
    if (!session.uploadUrl) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive did not return an upload session URL.'
      )
    }

    return this.uploadChunks(session.uploadUrl, bytes)
  }

  private async uploadChunks(
    uploadUrl: string,
    bytes: Buffer
  ): Promise<OneDriveVersionedItem> {
    let offset = 0
    let attempts = 0

    while (offset < bytes.length) {
      const end = Math.min(
        offset + ONE_DRIVE_RESUMABLE_CHUNK_SIZE,
        bytes.length
      )
      const chunk = bytes.subarray(offset, end)

      try {
        const response = await this.httpClient.request(
          uploadUrl,
          {
            method: 'PUT',
            headers: {
              'Content-Length': String(chunk.length),
              'Content-Range': `bytes ${offset}-${end - 1}/${bytes.length}`,
            },
            body: chunk,
          },
          [202, 416],
          false,
          false
        )
        if (response.status === 416) {
          if (attempts >= ONE_DRIVE_MAX_UPLOAD_ATTEMPTS - 1) {
            throw new SyncProviderError(
              SyncProviderErrorKindEnum.Transient,
              'OneDrive upload range could not be recovered.'
            )
          }

          attempts += 1
          offset = await this.queryUploadOffsetWithRetry(
            uploadUrl,
            offset,
            bytes.length
          )
          continue
        }

        attempts = 0
        if (response.status !== 202) {
          return this.readVersionedItem(response)
        }

        const state = await readOneDriveJson<OneDriveUploadSession>(response)
        offset = this.getNextOffset(state, end)
      } catch (error) {
        if (!this.canResume(error, attempts)) {
          throw error
        }

        attempts += 1
        await this.waitBeforeRetry(error)
        offset = await this.queryUploadOffsetWithRetry(
          uploadUrl,
          offset,
          bytes.length
        )
      }
    }

    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'OneDrive upload ended without a completed item.'
    )
  }

  private async queryUploadOffsetWithRetry(
    uploadUrl: string,
    currentOffset: number,
    totalSize: number
  ): Promise<number> {
    let attempts = 0

    while (attempts < ONE_DRIVE_MAX_UPLOAD_ATTEMPTS) {
      try {
        return await this.queryUploadOffset(uploadUrl, currentOffset, totalSize)
      } catch (error) {
        if (!this.canResume(error, attempts)) {
          throw error
        }

        attempts += 1
        await this.waitBeforeRetry(error)
      }
    }

    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Transient,
      'OneDrive upload status could not be recovered.'
    )
  }

  private async queryUploadOffset(
    uploadUrl: string,
    currentOffset: number,
    totalSize: number
  ): Promise<number> {
    const response = await this.httpClient.request(
      uploadUrl,
      { method: 'GET' },
      [],
      false,
      false
    )
    const state = await readOneDriveJson<OneDriveUploadSession>(response)
    const offset = this.getNextOffset(state, currentOffset)

    if (offset < currentOffset || offset > totalSize) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive returned an invalid upload offset.'
      )
    }

    return offset
  }

  private waitBeforeRetry(error: unknown): Promise<void> {
    const retryAfterMs =
      error instanceof SyncProviderError ? error.retryAfterMs : undefined

    return this.retryDelay(retryAfterMs ?? 0)
  }
  private getNextOffset(
    state: OneDriveUploadSession,
    fallback: number
  ): number {
    const start = state.nextExpectedRanges?.[0]?.split('-')[0]
    const offset = start === undefined ? fallback : Number(start)

    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive returned an invalid upload range.'
      )
    }

    return offset
  }

  private canResume(error: unknown, attempts: number): boolean {
    return (
      error instanceof SyncProviderError &&
      (error.kind === SyncProviderErrorKindEnum.Transient ||
        error.kind === SyncProviderErrorKindEnum.Throttled) &&
      attempts < ONE_DRIVE_MAX_UPLOAD_ATTEMPTS - 1
    )
  }

  private createPathContentUrl(parentId: string, name: string): string {
    return `${ONE_DRIVE_GRAPH_BASE_URL}/me/drive/items/${encodeURIComponent(parentId)}:/${encodeURIComponent(name)}:/content`
  }

  private async getItemByUrl(url: string): Promise<OneDriveVersionedItem> {
    const response = await this.httpClient.request(url)

    return this.readVersionedItem(response)
  }

  private async readVersionedItem(
    response: Response
  ): Promise<OneDriveVersionedItem> {
    const item = await readOneDriveJson<OneDriveItem>(response)
    const providerVersion = item.eTag ?? response.headers.get('etag')

    if (!item.id || !providerVersion) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'OneDrive returned an item without an ID or ETag.'
      )
    }

    return { item, providerVersion }
  }
}
