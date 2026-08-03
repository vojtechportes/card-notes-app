import {
  GOOGLE_DRIVE_MAX_UPLOAD_ATTEMPTS,
  GOOGLE_DRIVE_RESUMABLE_CHUNK_SIZE,
  GOOGLE_DRIVE_UPLOAD_BASE_URL,
} from './constants/google-drive.constants'
import { GoogleDriveHttpClient } from './google-drive-http-client'
import type { GoogleDriveFile } from './types/google-drive-file'
import type { GoogleDriveVersionedFile } from './types/google-drive-versioned-file'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'
import { createGoogleDriveUrl } from './utils/create-google-drive-url.util'
import { getGoogleDriveProviderVersion } from './utils/get-google-drive-provider-version.util'
import { getResumableUploadOffset } from './utils/get-resumable-upload-offset.util'
import { readGoogleDriveJson } from './utils/read-google-drive-json.util'

const FILE_FIELDS = 'id,name,mimeType,size,version,trashed,appProperties'

export class GoogleDriveResumableUploadService {
  constructor(private readonly httpClient: GoogleDriveHttpClient) {}

  async createFile(
    metadata: Record<string, unknown>,
    bytes: Buffer,
    mediaType: string
  ): Promise<GoogleDriveVersionedFile> {
    const initiation = await this.httpClient.request(
      createGoogleDriveUrl(GOOGLE_DRIVE_UPLOAD_BASE_URL, '/files', {
        uploadType: 'resumable',
        fields: FILE_FIELDS,
      }),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mediaType,
          'X-Upload-Content-Length': String(bytes.length),
        },
        body: JSON.stringify(metadata),
      }
    )
    const sessionUrl = initiation.headers.get('location')
    if (!sessionUrl) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Google Drive did not create a resumable upload session.'
      )
    }

    return this.uploadBytes(sessionUrl, bytes, mediaType)
  }

  private async uploadBytes(
    sessionUrl: string,
    bytes: Buffer,
    mediaType: string
  ): Promise<GoogleDriveVersionedFile> {
    let offset = 0
    let attempts = 0

    while (offset < bytes.length) {
      const end = Math.min(
        offset + GOOGLE_DRIVE_RESUMABLE_CHUNK_SIZE,
        bytes.length
      )
      const chunk = bytes.subarray(offset, end)

      try {
        const response = await this.uploadChunk(
          sessionUrl,
          bytes.length,
          offset,
          end,
          chunk,
          mediaType
        )
        if (response.status === 308) {
          const nextOffset = getResumableUploadOffset(
            response.headers.get('range')
          )
          if (nextOffset <= offset || nextOffset > bytes.length) {
            throw new SyncProviderError(
              SyncProviderErrorKindEnum.Permanent,
              'Google Drive returned invalid resumable upload progress.'
            )
          }

          offset = nextOffset
          attempts = 0
          continue
        }

        return this.readCompletedFile(response)
      } catch (error) {
        if (!this.canResume(error, attempts)) {
          throw error
        }

        attempts += 1
        const status = await this.queryStatus(sessionUrl, bytes.length)
        if (status.status === 308) {
          const resumedOffset = getResumableUploadOffset(
            status.headers.get('range')
          )
          if (resumedOffset < offset || resumedOffset > bytes.length) {
            throw new SyncProviderError(
              SyncProviderErrorKindEnum.Permanent,
              'Google Drive returned invalid resumable upload status.'
            )
          }

          offset = resumedOffset
          continue
        }

        return this.readCompletedFile(status)
      }
    }

    throw new SyncProviderError(
      SyncProviderErrorKindEnum.Permanent,
      'Google Drive resumable upload ended without a completed file.'
    )
  }

  private uploadChunk(
    sessionUrl: string,
    totalSize: number,
    offset: number,
    end: number,
    chunk: Buffer,
    mediaType: string
  ): Promise<Response> {
    return this.httpClient.request(
      sessionUrl,
      {
        method: 'PUT',
        headers: {
          'Content-Type': mediaType,
          'Content-Length': String(chunk.length),
          'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`,
        },
        body: chunk,
      },
      [308]
    )
  }

  private queryStatus(
    sessionUrl: string,
    totalSize: number
  ): Promise<Response> {
    return this.httpClient.request(
      sessionUrl,
      {
        method: 'PUT',
        headers: {
          'Content-Length': '0',
          'Content-Range': `bytes */${totalSize}`,
        },
      },
      [308]
    )
  }

  private canResume(error: unknown, attempts: number): boolean {
    return (
      error instanceof SyncProviderError &&
      error.kind === SyncProviderErrorKindEnum.Transient &&
      attempts < GOOGLE_DRIVE_MAX_UPLOAD_ATTEMPTS - 1
    )
  }

  private async readCompletedFile(
    response: Response
  ): Promise<GoogleDriveVersionedFile> {
    const file = await readGoogleDriveJson<GoogleDriveFile>(response)

    return {
      file,
      providerVersion: getGoogleDriveProviderVersion(response, file),
    }
  }
}
