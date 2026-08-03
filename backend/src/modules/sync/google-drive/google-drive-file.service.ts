import {
  GOOGLE_DRIVE_API_BASE_URL,
  GOOGLE_DRIVE_APP_DATA_FOLDER,
  GOOGLE_DRIVE_PAGE_SIZE,
  GOOGLE_DRIVE_UPLOAD_BASE_URL,
} from './constants/google-drive.constants'
import { GoogleDriveHttpClient } from './google-drive-http-client'
import { GoogleDriveResumableUploadService } from './google-drive-resumable-upload.service'
import type { GoogleDriveAbout } from './types/google-drive-about'
import type { GoogleDriveChangeList } from './types/google-drive-change-list'
import type { GoogleDriveFile } from './types/google-drive-file'
import type { GoogleDriveFileList } from './types/google-drive-file-list'
import type { GoogleDriveStartPageToken } from './types/google-drive-start-page-token'
import type { GoogleDriveVersionedFile } from './types/google-drive-versioned-file'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'
import { createGoogleDriveUrl } from './utils/create-google-drive-url.util'
import { createMultipartUploadBody } from './utils/create-multipart-upload-body.util'
import { getGoogleDriveProviderVersion } from './utils/get-google-drive-provider-version.util'
import { getResumableUploadOffset } from './utils/get-resumable-upload-offset.util'
import { readGoogleDriveJson } from './utils/read-google-drive-json.util'

const FILE_FIELDS = 'id,name,mimeType,size,version,trashed,appProperties'

export class GoogleDriveFileService {
  private readonly resumableUploadService: GoogleDriveResumableUploadService

  constructor(private readonly httpClient: GoogleDriveHttpClient) {
    this.resumableUploadService = new GoogleDriveResumableUploadService(
      httpClient
    )
  }

  async getAbout(): Promise<GoogleDriveAbout> {
    const response = await this.httpClient.request(
      createGoogleDriveUrl(GOOGLE_DRIVE_API_BASE_URL, '/about', {
        fields: 'user(permissionId,displayName)',
      })
    )

    return readGoogleDriveJson<GoogleDriveAbout>(response)
  }

  async getStartPageToken(): Promise<string> {
    const response = await this.httpClient.request(
      createGoogleDriveUrl(GOOGLE_DRIVE_API_BASE_URL, '/changes/startPageToken')
    )
    const result =
      await readGoogleDriveJson<GoogleDriveStartPageToken>(response)

    if (!result.startPageToken) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Permanent,
        'Google Drive did not return a start page token.'
      )
    }

    return result.startPageToken
  }

  async listFiles(
    query: string,
    pageToken?: string
  ): Promise<GoogleDriveFileList> {
    const response = await this.httpClient.request(
      createGoogleDriveUrl(GOOGLE_DRIVE_API_BASE_URL, '/files', {
        spaces: GOOGLE_DRIVE_APP_DATA_FOLDER,
        q: query,
        pageSize: String(GOOGLE_DRIVE_PAGE_SIZE),
        pageToken,
        fields: `nextPageToken,files(${FILE_FIELDS})`,
      })
    )

    return readGoogleDriveJson<GoogleDriveFileList>(response)
  }

  async listChanges(pageToken: string): Promise<GoogleDriveChangeList> {
    const response = await this.httpClient.request(
      createGoogleDriveUrl(GOOGLE_DRIVE_API_BASE_URL, '/changes', {
        spaces: GOOGLE_DRIVE_APP_DATA_FOLDER,
        pageToken,
        pageSize: String(GOOGLE_DRIVE_PAGE_SIZE),
        includeRemoved: 'true',
        fields: `nextPageToken,newStartPageToken,changes(fileId,removed,changeType,file(${FILE_FIELDS}))`,
      }),
      {},
      [],
      true
    )

    return readGoogleDriveJson<GoogleDriveChangeList>(response)
  }

  async getFile(fileId: string): Promise<GoogleDriveVersionedFile> {
    const response = await this.httpClient.request(
      createGoogleDriveUrl(
        GOOGLE_DRIVE_API_BASE_URL,
        `/files/${encodeURIComponent(fileId)}`,
        { fields: FILE_FIELDS }
      )
    )
    const file = await readGoogleDriveJson<GoogleDriveFile>(response)

    return {
      file,
      providerVersion: getGoogleDriveProviderVersion(response, file),
    }
  }

  async downloadFile(
    fileId: string,
    expectedVersion?: string
  ): Promise<{ bytes: Buffer; contentType: string }> {
    const headers: Record<string, string> = {}
    if (expectedVersion && !expectedVersion.startsWith('version:')) {
      headers['If-Match'] = expectedVersion
    }

    const response = await this.httpClient.request(
      createGoogleDriveUrl(
        GOOGLE_DRIVE_API_BASE_URL,
        `/files/${encodeURIComponent(fileId)}`,
        { alt: 'media' }
      ),
      { headers }
    )

    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType:
        response.headers.get('content-type') ?? 'application/octet-stream',
    }
  }

  async createMetadata(
    metadata: Record<string, unknown>
  ): Promise<GoogleDriveFile> {
    const response = await this.httpClient.request(
      createGoogleDriveUrl(GOOGLE_DRIVE_API_BASE_URL, '/files', {
        fields: FILE_FIELDS,
      }),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(metadata),
      }
    )

    return readGoogleDriveJson<GoogleDriveFile>(response)
  }

  async createMultipartFile(
    metadata: Record<string, unknown>,
    bytes: Buffer,
    mediaType: string
  ): Promise<GoogleDriveVersionedFile> {
    const multipart = createMultipartUploadBody(metadata, bytes, mediaType)
    const response = await this.httpClient.request(
      createGoogleDriveUrl(GOOGLE_DRIVE_UPLOAD_BASE_URL, '/files', {
        uploadType: 'multipart',
        fields: FILE_FIELDS,
      }),
      {
        method: 'POST',
        headers: { 'Content-Type': multipart.contentType },
        body: multipart.body,
      }
    )
    const file = await readGoogleDriveJson<GoogleDriveFile>(response)

    return {
      file,
      providerVersion: getGoogleDriveProviderVersion(response, file),
    }
  }

  async updateMultipartFile(
    fileId: string,
    expectedVersion: string,
    metadata: Record<string, unknown>,
    bytes: Buffer,
    mediaType: string
  ): Promise<GoogleDriveVersionedFile> {
    if (expectedVersion.startsWith('version:')) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.PreconditionFailed,
        'Google Drive cannot atomically update without an ETag.'
      )
    }

    const multipart = createMultipartUploadBody(metadata, bytes, mediaType)
    const response = await this.httpClient.request(
      createGoogleDriveUrl(
        GOOGLE_DRIVE_UPLOAD_BASE_URL,
        `/files/${encodeURIComponent(fileId)}`,
        { uploadType: 'multipart', fields: FILE_FIELDS }
      ),
      {
        method: 'PATCH',
        headers: {
          'Content-Type': multipart.contentType,
          'If-Match': expectedVersion,
        },
        body: multipart.body,
      }
    )
    const file = await readGoogleDriveJson<GoogleDriveFile>(response)

    return {
      file,
      providerVersion: getGoogleDriveProviderVersion(response, file),
    }
  }

  createResumableFile(
    metadata: Record<string, unknown>,
    bytes: Buffer,
    mediaType: string
  ): Promise<GoogleDriveVersionedFile> {
    return this.resumableUploadService.createFile(metadata, bytes, mediaType)
  }
}
