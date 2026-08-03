import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { readCredentialBrokerBootstrap } from '../../../../src/modules/sync/credential-broker/read-credential-broker-bootstrap'

describe('readCredentialBrokerBootstrap', () => {
  it('reads a bounded loopback bootstrap message from stdin', async () => {
    const bootstrap = {
      authorization: 'a'.repeat(48),
      baseUrl: 'http://127.0.0.1:4567',
    }
    const result = await readCredentialBrokerBootstrap(
      Readable.from(`${JSON.stringify(bootstrap)}\n`)
    )

    expect(result).toEqual(bootstrap)
  })

  it.each([
    { authorization: 'short', baseUrl: 'http://127.0.0.1:4567' },
    { authorization: 'a'.repeat(48), baseUrl: 'http://localhost:4567' },
    { authorization: 'a'.repeat(48), baseUrl: 'https://127.0.0.1:4567' },
  ])('rejects invalid bootstrap input', async (bootstrap) => {
    await expect(
      readCredentialBrokerBootstrap(
        Readable.from(`${JSON.stringify(bootstrap)}\n`)
      )
    ).rejects.toThrow('Broker bootstrap was invalid.')
  })
})
