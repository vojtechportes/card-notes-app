import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { CredentialBrokerClient } from '../../../../src/modules/sync/credential-broker/credential-broker.client'
import { credentialBrokerBootstrapState } from '../../../../src/modules/sync/credential-broker/credential-broker-bootstrap-state'
import { SyncProviderEnum } from '../../../../src/modules/sync/types/sync-provider-enum'

const servers: ReturnType<typeof createServer>[] = []

afterEach(async () => {
  credentialBrokerBootstrapState.value = null

  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve()))
      )
  )
})

describe('CredentialBrokerClient', () => {
  it('uses authenticated loopback requests and validates the provider response', async () => {
    let receivedAuthorization = ''
    let receivedBody = ''
    const server = createServer(async (request, response) => {
      receivedAuthorization = request.headers.authorization ?? ''

      for await (const chunk of request) {
        receivedBody += chunk.toString()
      }

      response.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          accessToken: 'short-lived-access-token',
          expiresAt: '2026-08-03T11:00:00.000Z',
          provider: SyncProviderEnum.GoogleDrive,
        })
      )
    })
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address() as AddressInfo
    credentialBrokerBootstrapState.value = {
      authorization: 'broker-authorization-secret',
      baseUrl: `http://127.0.0.1:${address.port}`,
    }

    const credential = await new CredentialBrokerClient().getAccessCredential(
      SyncProviderEnum.GoogleDrive
    )

    expect(credential.accessToken).toBe('short-lived-access-token')
    expect(receivedAuthorization).toBe('Bearer broker-authorization-secret')
    expect(JSON.parse(receivedBody)).toMatchObject({
      provider: SyncProviderEnum.GoogleDrive,
    })
    expect(JSON.parse(receivedBody).requestId).toEqual(expect.any(String))
  })

  it('returns a redacted error when broker credentials are unavailable', async () => {
    await expect(
      new CredentialBrokerClient().getAccessCredential(
        SyncProviderEnum.OneDrive
      )
    ).rejects.toThrow('Provider credentials are unavailable.')
  })
})
