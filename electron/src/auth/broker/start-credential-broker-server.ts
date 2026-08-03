import { createServer } from 'node:http'
import { createRandomBase64Url } from '../utils/create-random-base64-url.util.js'
import { isOAuthProvider } from '../utils/is-oauth-provider.util.js'
import type { CredentialBrokerServer } from '../types/credential-broker-server.js'
import type { CredentialBrokerServerOptions } from '../types/credential-broker-server-options.js'
import { readJsonRequestBody } from './read-json-request-body.util.js'
import { trackBrokerRequestId } from './track-broker-request-id.util.js'

interface BrokerRequestBody {
  provider: unknown
  requestId: unknown
}

export const startCredentialBrokerServer = async (
  options: CredentialBrokerServerOptions
): Promise<CredentialBrokerServer> => {
  const host = options.host ?? '127.0.0.1'
  const authorization = createRandomBase64Url(48)
  const usedRequestIds = new Map<string, number>()
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Content-Type', 'application/json')

    if (
      request.method !== 'POST' ||
      request.url !== '/v1/access-token' ||
      request.headers.authorization !== `Bearer ${authorization}`
    ) {
      response.writeHead(404).end('{"error":"broker-request-rejected"}')
      return
    }

    try {
      const body = (await readJsonRequestBody(request)) as BrokerRequestBody

      if (
        !body ||
        !isOAuthProvider(body.provider) ||
        typeof body.requestId !== 'string' ||
        body.requestId.length < 16 ||
        !trackBrokerRequestId(usedRequestIds, body.requestId)
      ) {
        throw new Error('broker-invalid-request')
      }

      const credential = await options.oauthService.getAccessCredential(
        body.provider
      )

      response.writeHead(200).end(JSON.stringify(credential))
    } catch {
      response.writeHead(401).end('{"error":"credential-unavailable"}')
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.listen(options.port ?? 0, host, resolve)
    server.once('error', reject)
  })

  const address = server.address()

  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('credential-broker-unavailable')
  }

  return {
    bootstrap: {
      authorization,
      baseUrl: `http://${host}:${address.port}`,
    },
    dispose: () => {
      usedRequestIds.clear()

      return new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    },
  }
}
