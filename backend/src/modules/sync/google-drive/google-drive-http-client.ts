import type { GoogleDriveAccessTokenProvider } from './types/google-drive-access-token-provider'
import type { GoogleDriveFetch } from './types/google-drive-fetch'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'
import { classifyGoogleDriveError } from './utils/classify-google-drive-error.util'
import { getGoogleDriveErrorReasons } from './utils/get-google-drive-error-reasons.util'
import { parseRetryAfter } from './utils/parse-retry-after.util'

export class GoogleDriveHttpClient {
  constructor(
    private readonly accessTokenProvider: GoogleDriveAccessTokenProvider,
    private readonly fetchImplementation: GoogleDriveFetch = fetch
  ) {}

  async request(
    url: string,
    init: RequestInit = {},
    acceptedStatuses: number[] = [],
    isChangeCursorRequest = false
  ): Promise<Response> {
    let accessToken: string
    try {
      accessToken = await this.accessTokenProvider()
    } catch {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Authentication,
        'Google Drive credentials are unavailable.'
      )
    }
    if (!accessToken) {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Authentication,
        'A Google Drive access token is required.'
      )
    }

    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)

    let response: Response
    try {
      response = await this.fetchImplementation(url, { ...init, headers })
    } catch {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Transient,
        'Google Drive could not be reached.'
      )
    }

    if (response.ok || acceptedStatuses.includes(response.status)) {
      return response
    }

    const reasons = await getGoogleDriveErrorReasons(response)
    const kind = classifyGoogleDriveError(
      response.status,
      reasons,
      isChangeCursorRequest
    )

    throw new SyncProviderError(
      kind,
      `Google Drive request failed with status ${response.status}.`,
      parseRetryAfter(response.headers.get('retry-after'))
    )
  }
}
