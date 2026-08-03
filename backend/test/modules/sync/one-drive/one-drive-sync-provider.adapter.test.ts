import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  ONE_DRIVE_APP_FOLDER_SCOPE,
  ONE_DRIVE_APP_ROOT_PATH,
} from '../../../../src/modules/sync/one-drive/constants/one-drive.constants'
import { OneDriveHttpClient } from '../../../../src/modules/sync/one-drive/one-drive-http-client'
import { OneDriveSyncProviderAdapter } from '../../../../src/modules/sync/one-drive/one-drive-sync-provider.adapter'
import { encodeOneDriveLogicalKey } from '../../../../src/modules/sync/one-drive/utils/encode-one-drive-logical-key.util'
import { parseOneDriveRetryAfter } from '../../../../src/modules/sync/one-drive/utils/parse-one-drive-retry-after.util'
import { SyncEntityKindEnum } from '../../../../src/modules/sync/types/sync-entity-kind-enum'
import { SyncProviderEnum } from '../../../../src/modules/sync/types/sync-provider-enum'
import { SyncProviderErrorKindEnum } from '../../../../src/modules/sync/types/sync-provider-error-kind-enum'
import type { SyncProviderObjectMappingReader } from '../../../../src/modules/sync/types/sync-provider-object-mapping-reader'
import { runSyncProviderAdapterContract } from '../contracts/run-sync-provider-adapter-contract'
import { MockOneDriveApi } from './mock-one-drive-api'

const workspaceId = '11111111-1111-4111-8111-111111111111'
const emptyMappingReader: SyncProviderObjectMappingReader = {
  findProviderObjectMetadata: () => null,
}

const createAdapter = (
  api: MockOneDriveApi,
  objectMappingReader = emptyMappingReader,
  resumableThreshold?: number,
  retryDelay: (milliseconds: number) => Promise<void> = async () => undefined
): OneDriveSyncProviderAdapter =>
  new OneDriveSyncProviderAdapter({
    accessTokenProvider: () => 'short-lived-access-token',
    identityProvider: () => ({
      accountId: 'microsoft-account',
      displayName: 'Microsoft account',
    }),
    objectMappingReader,
    fetch: api.fetch,
    resumableThreshold,
    retryDelay,
    workspaceId,
  })

runSyncProviderAdapterContract(() => {
  const api = new MockOneDriveApi(1)

  return {
    adapter: createAdapter(api),
    expireCursor: (cursor: string) => api.expireCursor(cursor),
  }
})

describe('OneDriveSyncProviderAdapter', () => {
  it('uses special/approot and exposes only the app-folder permission', async () => {
    const api = new MockOneDriveApi()
    const adapter = createAdapter(api)

    const requestsBeforeIdentity = api.requests.length
    await expect(adapter.getIdentity()).resolves.toMatchObject({
      providerName: 'one-drive',
      accountId: 'microsoft-account',
    })
    await adapter.createWorkspace(workspaceId)
    await adapter.enumerateObjects()

    expect(ONE_DRIVE_APP_FOLDER_SCOPE).toBe('Files.ReadWrite.AppFolder')
    expect(ONE_DRIVE_APP_ROOT_PATH).toBe('/me/drive/special/approot')
    expect(
      api.requests.every(({ init, url }) => {
        if (new URL(url).hostname === 'upload.test') {
          return !new Headers(init.headers).has('authorization')
        }

        return (
          new Headers(init.headers).get('authorization') ===
          'Bearer short-lived-access-token'
        )
      })
    ).toBe(true)
    expect(
      api.requests.some(({ url }) => url.includes('/special/approot'))
    ).toBe(true)
  })

  it('uses final delta links after paginated enumeration and changes', async () => {
    const api = new MockOneDriveApi(1)
    const adapter = createAdapter(api)
    await adapter.createDocument(
      'config.json',
      SyncEntityKindEnum.Configuration,
      JSON.stringify({ contentHash: 'a'.repeat(64) })
    )
    await adapter.createDocument(
      'notes/one.json',
      SyncEntityKindEnum.Note,
      JSON.stringify({ contentHash: 'b'.repeat(64) })
    )

    const first = await adapter.enumerateObjects()
    expect(first.nextPageToken).not.toBeNull()
    const second = await adapter.enumerateObjects(first.nextPageToken!)
    expect(second.nextPageToken).toBeNull()
    expect(second.candidateCursor).toContain('cursor=2')

    await adapter.createDocument(
      'notes/two.json',
      SyncEntityKindEnum.Note,
      JSON.stringify({ contentHash: 'c'.repeat(64) })
    )
    const changes = await adapter.listChanges(second.candidateCursor)
    expect(changes.changes).toHaveLength(1)
    expect(changes.candidateCursor).toContain('cursor=3')
  })

  it('sends If-None-Match and conditional ETags for writes and reads', async () => {
    const api = new MockOneDriveApi()
    const adapter = createAdapter(api)
    const created = await adapter.createDocument(
      'config.json',
      SyncEntityKindEnum.Configuration,
      JSON.stringify({ contentHash: 'a'.repeat(64) })
    )

    await adapter.updateDocument(
      'config.json',
      SyncEntityKindEnum.Configuration,
      JSON.stringify({ contentHash: 'b'.repeat(64) }),
      created.providerVersion
    )
    await adapter.readObject('config.json')

    const createRequest = api.requests.find(
      ({ init, url }) => init.method === 'PUT' && url.includes(':/content')
    )
    const updateRequest = api.requests.find(
      ({ init, url }) =>
        init.method === 'PUT' &&
        url.includes(`/items/${created.providerObjectId}/content`)
    )
    const readRequest = api.requests
      .filter(
        ({ init, url }) =>
          url.includes(`/items/${created.providerObjectId}/content`) &&
          init.method !== 'PUT'
      )
      .at(-1)

    expect(new Headers(createRequest?.init.headers).get('if-none-match')).toBe(
      '*'
    )
    expect(new Headers(updateRequest?.init.headers).get('if-match')).toBe(
      created.providerVersion
    )
    expect(new Headers(readRequest?.init.headers).get('if-match')).toMatch(
      /^"etag-/
    )
  })

  it('recovers deletion metadata through the durable item-ID mapping', async () => {
    const api = new MockOneDriveApi()
    const adapter = createAdapter(api)
    await adapter.createDocument(
      'config.json',
      SyncEntityKindEnum.Configuration,
      JSON.stringify({ contentHash: 'a'.repeat(64) })
    )
    const enumeration = await adapter.enumerateObjects()
    const metadata = enumeration.objects[0]
    const fileName = `object-${encodeOneDriveLogicalKey(metadata.logicalKey)}`
    api.deleteByLogicalFileName(fileName)

    const mappingReader: SyncProviderObjectMappingReader = {
      findProviderObjectMetadata: (provider, mappedWorkspaceId, itemId) => {
        if (
          provider === SyncProviderEnum.OneDrive &&
          mappedWorkspaceId === workspaceId &&
          itemId === metadata.providerObjectId
        ) {
          return metadata
        }

        return null
      },
    }
    const restarted = createAdapter(api, mappingReader)
    const changes = await restarted.listChanges(enumeration.candidateCursor)

    expect(changes.changes).toEqual([{ ...metadata, isDeleted: true }])
  })

  it('resumes interrupted upload sessions and verifies asset bytes', async () => {
    const api = new MockOneDriveApi()
    const adapter = createAdapter(api, emptyMappingReader, 1)
    const bytes = Buffer.alloc(700_000, 7)
    const hash = createHash('sha256').update(bytes).digest('hex')
    api.queueResponse('upload.test', new Response('{}', { status: 503 }))

    await expect(
      adapter.createAsset(`assets/${hash}.bin`, bytes, hash)
    ).resolves.toMatchObject({ providerObjectId: expect.any(String) })
    expect(
      api.requests.some(({ url }) => url.endsWith('/createUploadSession'))
    ).toBe(true)
    expect(
      api.requests.some(
        ({ init, url }) =>
          new URL(url).hostname === 'upload.test' && init.method === 'GET'
      )
    ).toBe(true)
  })

  it('rejects corrupt bytes after an upload completes', async () => {
    const api = new MockOneDriveApi()
    const adapter = createAdapter(api)
    const bytes = Buffer.from('valid asset')
    const hash = createHash('sha256').update(bytes).digest('hex')
    api.corruptNextDownload(Buffer.from('corrupt asset'))

    await expect(
      adapter.createAsset(`assets/${hash}.bin`, bytes, hash)
    ).rejects.toMatchObject({ kind: SyncProviderErrorKindEnum.Permanent })
  })
  it('paginates incremental delta changes to the terminal link', async () => {
    const api = new MockOneDriveApi(1)
    const adapter = createAdapter(api)
    const initial = await adapter.enumerateObjects()

    await adapter.createDocument(
      'notes/one.json',
      SyncEntityKindEnum.Note,
      JSON.stringify({ contentHash: 'a'.repeat(64) })
    )
    await adapter.createDocument(
      'notes/two.json',
      SyncEntityKindEnum.Note,
      JSON.stringify({ contentHash: 'b'.repeat(64) })
    )

    const first = await adapter.listChanges(initial.candidateCursor)
    const second = await adapter.listChanges(
      initial.candidateCursor,
      first.nextPageToken!
    )

    expect(first.changes).toHaveLength(1)
    expect(first.nextPageToken).not.toBeNull()
    expect(first.candidateCursor).toBe(initial.candidateCursor)
    expect(second.changes).toHaveLength(1)
    expect(second.nextPageToken).toBeNull()
    expect(second.candidateCursor).not.toBe(initial.candidateCursor)
  })

  it('queries upload status after a 416 range race', async () => {
    const api = new MockOneDriveApi()
    const adapter = createAdapter(api, emptyMappingReader, 1)
    const bytes = Buffer.alloc(700_000, 8)
    const hash = createHash('sha256').update(bytes).digest('hex')
    api.queueResponse('upload.test', new Response('{}', { status: 416 }))

    await expect(
      adapter.createAsset(`assets/${hash}.bin`, bytes, hash)
    ).resolves.toMatchObject({ providerObjectId: expect.any(String) })
    expect(
      api.requests.some(
        ({ init, url }) =>
          new URL(url).hostname === 'upload.test' && init.method === 'GET'
      )
    ).toBe(true)
  })

  it('honors Retry-After before recovering a throttled upload', async () => {
    const api = new MockOneDriveApi()
    const delays: number[] = []
    const adapter = createAdapter(
      api,
      emptyMappingReader,
      1,
      async (milliseconds) => {
        delays.push(milliseconds)
      }
    )
    const bytes = Buffer.alloc(700_000, 9)
    const hash = createHash('sha256').update(bytes).digest('hex')
    api.queueResponse(
      'upload.test',
      new Response('{}', {
        status: 429,
        headers: { 'retry-after': '5' },
      })
    )

    await expect(
      adapter.createAsset(`assets/${hash}.bin`, bytes, hash)
    ).resolves.toMatchObject({ providerObjectId: expect.any(String) })
    expect(delays).toContain(5_000)
  })

  it('retries a throttled upload-status query', async () => {
    const api = new MockOneDriveApi()
    const delays: number[] = []
    const adapter = createAdapter(
      api,
      emptyMappingReader,
      1,
      async (milliseconds) => {
        delays.push(milliseconds)
      }
    )
    const bytes = Buffer.alloc(700_000, 10)
    const hash = createHash('sha256').update(bytes).digest('hex')
    api.queueResponse('upload.test', new Response('{}', { status: 503 }))
    api.queueResponse(
      'upload.test',
      new Response('{}', {
        status: 429,
        headers: { 'retry-after': '2' },
      })
    )

    await expect(
      adapter.createAsset(`assets/${hash}.bin`, bytes, hash)
    ).resolves.toMatchObject({ providerObjectId: expect.any(String) })
    expect(delays).toEqual([0, 2_000])
  })
  it('redacts rejected injected account identity', async () => {
    const api = new MockOneDriveApi()
    const adapter = new OneDriveSyncProviderAdapter({
      accessTokenProvider: () => 'token',
      identityProvider: () => Promise.reject(new Error('account-secret')),
      objectMappingReader: emptyMappingReader,
      fetch: api.fetch,
      workspaceId,
    })

    const error = await adapter.getIdentity().catch((value: unknown) => value)

    expect(error).toMatchObject({
      kind: SyncProviderErrorKindEnum.Authentication,
    })
    expect(String(error)).not.toContain('account-secret')
    expect(api.requests).toHaveLength(0)
  })
})

describe('OneDriveHttpClient error classification', () => {
  const cases = [
    [401, undefined, SyncProviderErrorKindEnum.Authentication],
    [403, undefined, SyncProviderErrorKindEnum.Authentication],
    [404, undefined, SyncProviderErrorKindEnum.NotFound],
    [412, undefined, SyncProviderErrorKindEnum.PreconditionFailed],
    [429, 'throttledRequest', SyncProviderErrorKindEnum.Throttled],
    [507, 'quotaLimitReached', SyncProviderErrorKindEnum.Quota],
    [503, undefined, SyncProviderErrorKindEnum.Transient],
  ] as const

  for (const [status, code, kind] of cases) {
    it(`maps status ${status} to ${kind}`, async () => {
      const api = new MockOneDriveApi()
      api.queueResponse(
        '/me/drive',
        new Response(JSON.stringify({ error: { code } }), {
          status,
          headers: { 'retry-after': '12' },
        })
      )
      const client = new OneDriveHttpClient(() => 'token', api.fetch)

      await expect(
        client.request('https://graph.microsoft.com/v1.0/me/drive')
      ).rejects.toMatchObject({ kind, retryAfterMs: 12_000 })
    })
  }

  it('maps invalid delta state to InvalidCursor', async () => {
    const api = new MockOneDriveApi()
    api.queueResponse(
      '/delta',
      new Response(JSON.stringify({ error: { code: 'resyncRequired' } }), {
        status: 410,
      })
    )
    const adapter = createAdapter(api)

    await expect(
      adapter.listChanges(
        'https://graph.microsoft.com/v1.0/me/drive/items/app-root/delta?cursor=0'
      )
    ).rejects.toMatchObject({ kind: SyncProviderErrorKindEnum.InvalidCursor })
  })

  it('redacts credential and network supplier failures', async () => {
    const credentialClient = new OneDriveHttpClient(
      () => Promise.reject(new Error('refresh-token-secret')),
      fetch
    )
    const credentialError = await credentialClient
      .request('https://graph.microsoft.com/v1.0/me/drive')
      .catch((error: unknown) => error)
    expect(String(credentialError)).not.toContain('refresh-token-secret')

    const api = new MockOneDriveApi()
    api.queueResponse('/me/drive', new Error('private-token-leak'))
    const networkClient = new OneDriveHttpClient(
      () => 'private-token',
      api.fetch
    )
    const networkError = await networkClient
      .request('https://graph.microsoft.com/v1.0/me/drive')
      .catch((error: unknown) => error)
    expect(networkError).toMatchObject({
      kind: SyncProviderErrorKindEnum.Transient,
    })
    expect(String(networkError)).not.toContain('private-token')
  })

  it('parses HTTP-date Retry-After values', () => {
    const now = Date.parse('2026-08-03T10:00:00.000Z')

    expect(parseOneDriveRetryAfter('Mon, 03 Aug 2026 10:00:05 GMT', now)).toBe(
      5_000
    )
  })
})
