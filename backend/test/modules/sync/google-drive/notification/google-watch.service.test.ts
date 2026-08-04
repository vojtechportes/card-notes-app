import { describe, expect, it, vi } from 'vitest'
import { GoogleWatchService } from '../../../../../src/modules/sync/google-drive/notification/google-watch.service'

const preparedChannel = {
  channelId: 'channel-id',
  verificationToken: 'verification-token',
  webhookUrl: 'https://relay.example/webhook',
  preparationExpiresAt: 2_000_000,
}

describe(GoogleWatchService.name, () => {
  it('creates a Google changes watch from the authoritative cursor', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = []
    const fetchImplementation = vi.fn(
      async (input: string | URL | Request, init: RequestInit = {}) => {
        requests.push({ url: String(input), init })

        return new Response(
          JSON.stringify({
            id: preparedChannel.channelId,
            resourceId: 'resource-id',
            expiration: '518401000',
          }),
          { status: 200 }
        )
      }
    )
    const service = new GoogleWatchService(() => 'access-token', {
      fetchImplementation,
      now: () => 1_000,
    })

    const channel = await service.watch('cursor-42', preparedChannel)

    expect(channel).toEqual({
      channelId: 'channel-id',
      resourceId: 'resource-id',
      expiresAt: 518401000,
    })
    const request = requests[0]
    const url = new URL(request.url)
    expect(url.pathname).toBe('/drive/v3/changes/watch')
    expect(url.searchParams.get('pageToken')).toBe('cursor-42')
    expect(url.searchParams.get('spaces')).toBe('appDataFolder')
    expect(new Headers(request.init.headers).get('authorization')).toBe(
      'Bearer access-token'
    )
    expect(JSON.parse(String(request.init.body))).toMatchObject({
      id: preparedChannel.channelId,
      type: 'web_hook',
      address: preparedChannel.webhookUrl,
      token: preparedChannel.verificationToken,
    })
  })

  it('rejects malformed Google channel responses', async () => {
    const service = new GoogleWatchService(() => 'access-token', {
      fetchImplementation: async () =>
        new Response(JSON.stringify({ id: 'different-channel' }), {
          status: 200,
        }),
      now: () => 1_000,
    })

    await expect(service.watch('cursor', preparedChannel)).rejects.toThrow(
      'invalid notification channel'
    )
  })

  it('stops a retired channel only with its matching resource identifier', async () => {
    const fetchImplementation = vi.fn(async () => new Response(null))
    const service = new GoogleWatchService(() => 'access-token', {
      fetchImplementation,
    })

    await service.stop('old-channel', 'old-resource')

    const [url, init] = fetchImplementation.mock.calls[0]
    expect(String(url)).toContain('/drive/v3/channels/stop')
    expect(JSON.parse(String(init?.body))).toEqual({
      id: 'old-channel',
      resourceId: 'old-resource',
    })
  })
})
