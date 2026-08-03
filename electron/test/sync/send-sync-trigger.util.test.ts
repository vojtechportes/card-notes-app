import assert from 'node:assert/strict'
import test from 'node:test'
import { sendSyncTrigger } from '../../src/sync/utils/send-sync-trigger.util.js'

test('posts a narrow trigger payload to the backend', async () => {
  let requestedUrl = ''
  let requestedInit: RequestInit | undefined
  const fetchImplementation = (async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    requestedUrl = input.toString()
    requestedInit = init

    return new Response()
  }) as typeof fetch

  await sendSyncTrigger(
    'http://127.0.0.1:3000/api',
    'focus',
    fetchImplementation
  )

  assert.equal(requestedUrl, 'http://127.0.0.1:3000/api/sync/trigger')
  assert.equal(requestedInit?.body, JSON.stringify({ trigger: 'focus' }))
  assert.deepEqual(requestedInit?.headers, {
    'Content-Type': 'application/json',
  })
  assert.equal(requestedInit?.method, 'POST')
  assert.ok(requestedInit?.signal instanceof AbortSignal)
})

test('keeps lifecycle delivery best-effort while the backend is unavailable', async () => {
  const fetchImplementation = (() =>
    Promise.reject(new Error('offline'))) as typeof fetch

  await assert.doesNotReject(() =>
    sendSyncTrigger('http://127.0.0.1:3000/api', 'resume', fetchImplementation)
  )
})

test('bounds an unavailable backend request with an abort timeout', async () => {
  let observedSignal: AbortSignal | null = null
  const fetchImplementation = ((
    _input: string | URL | Request,
    init?: RequestInit
  ) => {
    observedSignal = init?.signal as AbortSignal

    return new Promise<Response>((_resolve, reject) => {
      observedSignal?.addEventListener('abort', () => {
        reject(new Error('aborted'))
      })
    })
  }) as typeof fetch

  await assert.doesNotReject(() =>
    sendSyncTrigger('http://127.0.0.1:3000/api', 'quit', fetchImplementation, 1)
  )
  assert.equal(observedSignal?.aborted, true)
})
