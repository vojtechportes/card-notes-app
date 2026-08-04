import { GOOGLE_DRIVE_API_BASE_URL } from '../constants/google-drive.constants'
import { GoogleDriveHttpClient } from '../google-drive-http-client'
import type { GoogleDriveAccessTokenProvider } from '../types/google-drive-access-token-provider'
import type { GoogleWatchChannel } from './types/google-watch-channel'
import type { GoogleWatchServiceOptions } from './types/google-watch-service-options'
import type { PreparedRelayChannel } from './types/prepared-relay-channel'

const GOOGLE_CHANNEL_LIFETIME_MS = 6 * 24 * 60 * 60_000

interface GoogleWatchResponse {
  id?: string
  resourceId?: string
  expiration?: string
}

export class GoogleWatchService {
  private readonly httpClient: GoogleDriveHttpClient
  private readonly now: () => number

  constructor(
    accessTokenProvider: GoogleDriveAccessTokenProvider,
    options: GoogleWatchServiceOptions = {}
  ) {
    this.httpClient = new GoogleDriveHttpClient(
      accessTokenProvider,
      options.fetchImplementation
    )
    this.now = options.now ?? Date.now
  }

  async watch(
    cursor: string,
    preparedChannel: PreparedRelayChannel
  ): Promise<GoogleWatchChannel> {
    const requestedExpiration = this.now() + GOOGLE_CHANNEL_LIFETIME_MS
    const url = new URL(`${GOOGLE_DRIVE_API_BASE_URL}/changes/watch`)
    url.searchParams.set('pageToken', cursor)
    url.searchParams.set('spaces', 'appDataFolder')
    const response = await this.httpClient.request(url.toString(), {
      body: JSON.stringify({
        id: preparedChannel.channelId,
        type: 'web_hook',
        address: preparedChannel.webhookUrl,
        token: preparedChannel.verificationToken,
        expiration: String(requestedExpiration),
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const value = (await response.json()) as GoogleWatchResponse
    const expiresAt = Number(value.expiration)

    if (
      value.id !== preparedChannel.channelId ||
      typeof value.resourceId !== 'string' ||
      value.resourceId.length === 0 ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= this.now()
    ) {
      throw new Error('Google Drive returned an invalid notification channel.')
    }

    return {
      channelId: value.id,
      resourceId: value.resourceId,
      expiresAt,
    }
  }

  async stop(channelId: string, resourceId: string): Promise<void> {
    await this.httpClient.request(
      `${GOOGLE_DRIVE_API_BASE_URL}/channels/stop`,
      {
        body: JSON.stringify({ id: channelId, resourceId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }
    )
  }
}
