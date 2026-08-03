import { createServer, type Server } from 'node:http'
import { OAUTH_CALLBACK_PATH_PREFIX } from '../constants/oauth-security.constants.js'
import type { OAuthCallbackResult } from '../types/oauth-callback-result.js'
import type { OAuthLoopbackListener } from '../types/oauth-loopback-listener.js'
import type { OAuthProviderEnum } from '../types/oauth-provider-enum.js'
import { isStateValid } from '../utils/is-state-valid.util.js'

export const createOAuthLoopbackListener = async (
  provider: OAuthProviderEnum,
  expectedState: string,
  timeoutMs: number
): Promise<OAuthLoopbackListener> => {
  let server: Server
  let timeout: NodeJS.Timeout | undefined
  let rejectResult: (error: Error) => void = () => undefined
  let settled = false
  const callbackPath = `${OAUTH_CALLBACK_PATH_PREFIX}${provider}`

  const result = new Promise<OAuthCallbackResult>((resolve, reject) => {
    rejectResult = reject
    server = createServer((request, response) => {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')

      if (
        request.method !== 'GET' ||
        request.headers.host?.split(':')[0] !== '127.0.0.1' ||
        requestUrl.pathname !== callbackPath
      ) {
        response.writeHead(404).end()
        return
      }

      if (settled) {
        response
          .writeHead(409)
          .end('This authorization callback was already used.')
        return
      }

      const state = requestUrl.searchParams.get('state') ?? ''

      if (!isStateValid(state, expectedState)) {
        settled = true
        response.writeHead(400).end('The authorization response was rejected.')
        finish()
        reject(new Error('oauth-state-mismatch'))
        return
      }

      if (requestUrl.searchParams.has('error')) {
        settled = true
        response.writeHead(400).end('Authorization was not completed.')
        finish()
        reject(new Error('oauth-provider-denied'))
        return
      }

      const code = requestUrl.searchParams.get('code')

      if (!code) {
        settled = true
        response
          .writeHead(400)
          .end('The authorization response was incomplete.')
        finish()
        reject(new Error('oauth-invalid-callback'))
        return
      }

      settled = true
      response
        .writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end('Authorization completed. You can return to NoteStack.')
      finish()
      resolve({ code })
    })

    const finish = (): void => {
      if (timeout) {
        clearTimeout(timeout)
      }

      server.close()
    }

    server.once('error', () => {
      if (settled) {
        return
      }

      settled = true
      finish()
      reject(new Error('oauth-unavailable'))
    })
  })

  await new Promise<void>((resolve, reject) => {
    server!.listen(0, '127.0.0.1', () => resolve())
    server!.once('error', reject)
  })

  const address = server!.address()

  if (!address || typeof address === 'string') {
    server!.close()
    throw new Error('oauth-unavailable')
  }

  timeout = setTimeout(() => {
    if (settled) {
      return
    }

    settled = true
    server!.close()
    rejectResult(new Error('oauth-timeout'))
  }, timeoutMs)
  timeout.unref()

  return {
    cancel: () => {
      if (settled) {
        return
      }

      settled = true
      if (timeout) {
        clearTimeout(timeout)
      }
      server!.close()
      rejectResult(new Error('oauth-cancelled'))
    },
    redirectUri: `http://127.0.0.1:${address.port}${callbackPath}`,
    result,
  }
}
