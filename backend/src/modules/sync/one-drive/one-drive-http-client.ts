import type { OneDriveAccessTokenProvider } from './types/one-drive-access-token-provider'
import type { OneDriveFetch } from './types/one-drive-fetch'
import { SyncProviderError } from '../types/sync-provider-error'
import { SyncProviderErrorKindEnum } from '../types/sync-provider-error-kind-enum'
import { classifyOneDriveError } from './utils/classify-one-drive-error.util'
import { parseOneDriveRetryAfter } from './utils/parse-one-drive-retry-after.util'

export class OneDriveHttpClient {
  constructor(
    private readonly accessTokenProvider: OneDriveAccessTokenProvider,
    private readonly fetchImplementation: OneDriveFetch = fetch
  ) {}

  async request(
    url: string,
    init: RequestInit = {},
    acceptedStatuses: number[] = [],
    isDeltaRequest = false,
    authenticate = true
  ): Promise<Response> {
    const headers = new Headers(init.headers)

    if (authenticate) {
      let accessToken: string
      try {
        accessToken = await this.accessTokenProvider()
      } catch {
        throw new SyncProviderError(
          SyncProviderErrorKindEnum.Authentication,
          'OneDrive credentials are unavailable.'
        )
      }
      if (!accessToken) {
        throw new SyncProviderError(
          SyncProviderErrorKindEnum.Authentication,
          'A OneDrive access token is required.'
        )
      }

      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    let response: Response
    try {
      response = await this.fetchImplementation(url, { ...init, headers })
    } catch {
      throw new SyncProviderError(
        SyncProviderErrorKindEnum.Transient,
        'Microsoft Graph could not be reached.'
      )
    }

    if (response.ok || acceptedStatuses.includes(response.status)) {
      return response
    }

    const code = await this.readErrorCode(response)
    const kind = classifyOneDriveError(response.status, code, isDeltaRequest)

    throw new SyncProviderError(
      kind,
      `Microsoft Graph request failed with status ${response.status}.`,
      parseOneDriveRetryAfter(response.headers.get('retry-after'))
    )
  }

  private async readErrorCode(response: Response): Promise<string | undefined> {
    try {
      const value = (await response.clone().json()) as {
        error?: { code?: unknown }
      }

      return typeof value.error?.code === 'string'
        ? value.error.code
        : undefined
    } catch {
      return undefined
    }
  }
}
