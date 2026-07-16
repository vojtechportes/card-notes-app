import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchBackendHealth } from '../../../src/startup/utils/fetch-backend-health.util'

test('bounds an individual stalled health request', async () => {
  let requestAborted = false
  const fetcher = ((_url: string | URL | Request, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        'abort',
        () => {
          requestAborted = true
          reject(new DOMException('Aborted', 'AbortError'))
        },
        { once: true }
      )
    })
  }) as typeof fetch
  const keepEventLoopAlive = setTimeout(() => undefined, 50)

  const result = await fetchBackendHealth(
    'http://127.0.0.1/api/health',
    new AbortController().signal,
    5,
    fetcher
  )

  clearTimeout(keepEventLoopAlive)
  assert.equal(result, false)
  assert.equal(requestAborted, true)
})

test('forwards a healthy response', async () => {
  const fetcher = (async () =>
    new Response(null, { status: 200 })) as typeof fetch

  const result = await fetchBackendHealth(
    'http://127.0.0.1/api/health',
    new AbortController().signal,
    50,
    fetcher
  )

  assert.equal(result, true)
})
