import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  GOOGLE_DRIVE_APP_DATA_FOLDER,
  GOOGLE_DRIVE_APP_DATA_SCOPE,
  googleDriveAppPropertyKeys,
  googleDriveAppPropertyRoles,
} from '../../../../src/modules/sync/google-drive/constants/google-drive.constants'
import { GoogleDriveHttpClient } from '../../../../src/modules/sync/google-drive/google-drive-http-client'
import { GoogleDriveSyncProviderAdapter } from '../../../../src/modules/sync/google-drive/google-drive-sync-provider.adapter'
import { compareGoogleDriveFileId } from '../../../../src/modules/sync/google-drive/utils/compare-google-drive-file-id.util'
import { SyncEntityKindEnum } from '../../../../src/modules/sync/types/sync-entity-kind-enum'
import { SyncProviderEnum } from '../../../../src/modules/sync/types/sync-provider-enum'
import { SyncProviderErrorKindEnum } from '../../../../src/modules/sync/types/sync-provider-error-kind-enum'
import type { SyncProviderObjectMappingReader } from '../../../../src/modules/sync/types/sync-provider-object-mapping-reader'
import type { SyncProviderObjectMetadata } from '../../../../src/modules/sync/types/sync-provider-object-metadata'
import { runSyncProviderAdapterContract } from '../contracts/run-sync-provider-adapter-contract'
import { MockGoogleDriveApi } from './mock-google-drive-api'

const workspaceId = '11111111-1111-4111-8111-111111111111'
const emptyMappingReader: SyncProviderObjectMappingReader = {
  findProviderObjectMetadata: () => null,
}

const createAdapter = (
  api: MockGoogleDriveApi,
  objectMappingReader = emptyMappingReader,
  resumableThreshold?: number
): GoogleDriveSyncProviderAdapter =>
  new GoogleDriveSyncProviderAdapter({
    accessTokenProvider: () => 'short-lived-access-token',
    objectMappingReader,
    fetch: api.fetch,
    resumableThreshold,
    workspaceId,
  })

runSyncProviderAdapterContract(() => {
  const api = new MockGoogleDriveApi(1)

  return {
    adapter: createAdapter(api),
    expireCursor: (cursor: string) => api.expireCursor(cursor),
  }
})

describe('Google Drive canonical ordering', () => {
  it('orders opaque mixed-case IDs by locale-independent code units', () => {
    const files = [{ id: 'a-file' }, { id: 'B-file' }, { id: 'A-file' }]

    expect(files.sort(compareGoogleDriveFileId)).toEqual([
      { id: 'A-file' },
      { id: 'B-file' },
      { id: 'a-file' },
    ])
  })
})
describe('GoogleDriveSyncProviderAdapter', () => {
  it('uses the app-data-only boundary and exposes the required OAuth scope', async () => {
    const api = new MockGoogleDriveApi()
    const adapter = createAdapter(api)

    await expect(adapter.getIdentity()).resolves.toMatchObject({
      providerName: 'google-drive',
      accountId: 'google-account',
    })
    await adapter.createWorkspace(workspaceId)
    await adapter.enumerateObjects()

    expect(GOOGLE_DRIVE_APP_DATA_SCOPE).toBe(
      'https://www.googleapis.com/auth/drive.appdata'
    )
    expect(
      api.requests.every(
        ({ init }) =>
          new Headers(init.headers).get('authorization') ===
          'Bearer short-lived-access-token'
      )
    ).toBe(true)
    expect(
      api.requests
        .filter(({ url }) => new URL(url).pathname.endsWith('/files'))
        .some(
          ({ url }) =>
            new URL(url).searchParams.get('spaces') ===
            GOOGLE_DRIVE_APP_DATA_FOLDER
        )
    ).toBe(true)
  })

  it('captures the start token before paginated enumeration', async () => {
    const api = new MockGoogleDriveApi(1)
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
    const second = await adapter.enumerateObjects(first.nextPageToken!)
    expect(first.objects).toHaveLength(1)
    expect(second.objects).toHaveLength(1)

    const startIndex = api.requests.findIndex(({ url }) =>
      new URL(url).pathname.endsWith('/changes/startPageToken')
    )
    const enumerationIndex = api.requests.findIndex(
      ({ url }, index) =>
        index > startIndex &&
        new URL(url).pathname.endsWith('/files') &&
        new URL(url).searchParams.has('spaces')
    )
    expect(startIndex).toBeGreaterThanOrEqual(0)
    expect(startIndex).toBeLessThan(enumerationIndex)
  })

  it('paginates multiple incremental change pages to a terminal cursor', async () => {
    const api = new MockGoogleDriveApi(1)
    const adapter = createAdapter(api)
    const initial = await adapter.enumerateObjects()

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

    const first = await adapter.listChanges(initial.candidateCursor)
    const second = await adapter.listChanges(
      initial.candidateCursor,
      first.nextPageToken!
    )

    expect(first.changes).toHaveLength(1)
    expect(first.nextPageToken).not.toBeNull()
    expect(second.changes).toHaveLength(1)
    expect(second.nextPageToken).toBeNull()
    expect(Number(second.candidateCursor)).toBeGreaterThan(
      Number(initial.candidateCursor)
    )
  })

  it('classifies objects from stable metadata independently of file names', async () => {
    const api = new MockGoogleDriveApi()
    const adapter = createAdapter(api)
    api.seedMetadata(
      {
        name: 'unrelated-flat-provider-name',
        parents: [GOOGLE_DRIVE_APP_DATA_FOLDER],
        appProperties: {
          [googleDriveAppPropertyKeys.role]: googleDriveAppPropertyRoles.object,
          [googleDriveAppPropertyKeys.workspaceId]: workspaceId,
          [googleDriveAppPropertyKeys.logicalKey]: 'config.json',
          [googleDriveAppPropertyKeys.entityKind]:
            SyncEntityKindEnum.Configuration,
          [googleDriveAppPropertyKeys.contentHash]: 'a'.repeat(64),
        },
      },
      Buffer.from('{}')
    )

    const page = await adapter.enumerateObjects()

    expect(page.objects).toHaveLength(1)
    expect(page.objects[0]).toMatchObject({
      logicalKey: 'config.json',
      entityKind: SyncEntityKindEnum.Configuration,
    })
  })
  it('ignores updates and deletions owned by another workspace', async () => {
    const api = new MockGoogleDriveApi()
    const adapter = createAdapter(api)
    const initial = await adapter.enumerateObjects()
    const foreignWorkspaceId = '99999999-9999-4999-8999-999999999999'
    api.seedMetadata(
      {
        name: 'foreign-config',
        parents: [GOOGLE_DRIVE_APP_DATA_FOLDER],
        appProperties: {
          [googleDriveAppPropertyKeys.role]: googleDriveAppPropertyRoles.object,
          [googleDriveAppPropertyKeys.workspaceId]: foreignWorkspaceId,
          [googleDriveAppPropertyKeys.logicalKey]: 'config.json',
          [googleDriveAppPropertyKeys.entityKind]:
            SyncEntityKindEnum.Configuration,
          [googleDriveAppPropertyKeys.contentHash]: 'a'.repeat(64),
        },
      },
      Buffer.from('{}')
    )

    const updatePage = await adapter.listChanges(initial.candidateCursor)
    expect(updatePage.changes).toEqual([])

    api.deleteByLogicalKey('config.json')
    const deletePage = await adapter.listChanges(updatePage.candidateCursor)
    expect(deletePage.changes).toEqual([])
  })

  it('arbitrates concurrent creates to one deterministic canonical object', async () => {
    const api = new MockGoogleDriveApi(1)
    const adapter = createAdapter(api)
    api.createDuplicateDuringNextCreate()

    await expect(
      adapter.createDocument(
        'config.json',
        SyncEntityKindEnum.Configuration,
        JSON.stringify({ contentHash: 'a'.repeat(64) })
      )
    ).rejects.toMatchObject({
      kind: SyncProviderErrorKindEnum.PreconditionFailed,
    })

    const first = await adapter.enumerateObjects()
    const second = await adapter.enumerateObjects(first.nextPageToken!)
    expect([...first.objects, ...second.objects]).toHaveLength(1)
    expect([...first.objects, ...second.objects][0].logicalKey).toBe(
      'config.json'
    )
  })

  it('rejects content reads when the remote version changes before download', async () => {
    const api = new MockGoogleDriveApi()
    const adapter = createAdapter(api)
    await adapter.createDocument(
      'config.json',
      SyncEntityKindEnum.Configuration,
      JSON.stringify({ contentHash: 'a'.repeat(64) })
    )
    api.queueResponse('alt=media', new Response('{}', { status: 412 }))

    await expect(adapter.readObject('config.json')).rejects.toMatchObject({
      kind: SyncProviderErrorKindEnum.PreconditionFailed,
    })
    const mediaRequest = api.requests.find(({ url }) =>
      url.includes('alt=media')
    )
    expect(new Headers(mediaRequest?.init.headers).get('if-match')).toMatch(
      /^"etag-/
    )
  })
  it('recovers removed-file classification from durable provider-ID mapping', async () => {
    const api = new MockGoogleDriveApi()
    const firstAdapter = createAdapter(api)
    await firstAdapter.createDocument(
      'config.json',
      SyncEntityKindEnum.Configuration,
      JSON.stringify({ contentHash: 'a'.repeat(64) })
    )
    const enumeration = await firstAdapter.enumerateObjects()
    const metadata = enumeration.objects[0]
    api.deleteByLogicalKey(metadata.logicalKey)

    const mappingReader: SyncProviderObjectMappingReader = {
      findProviderObjectMetadata: (provider, mappedWorkspaceId, objectId) => {
        if (
          provider === SyncProviderEnum.GoogleDrive &&
          mappedWorkspaceId === workspaceId &&
          objectId === metadata.providerObjectId
        ) {
          return metadata
        }

        return null
      },
    }
    const restartedAdapter = createAdapter(api, mappingReader)
    const changes = await restartedAdapter.listChanges(
      enumeration.candidateCursor
    )

    expect(changes.changes).toEqual([{ ...metadata, isDeleted: true }])
  })

  it('uses resumable transfer and verifies completed asset bytes', async () => {
    const api = new MockGoogleDriveApi()
    const adapter = createAdapter(api, emptyMappingReader, 1)
    const bytes = Buffer.alloc(300_000, 7)
    const hash = createHash('sha256').update(bytes).digest('hex')

    await adapter.createAsset(`assets/${hash}.bin`, bytes, hash)

    expect(
      api.requests.some(
        ({ url }) => new URL(url).searchParams.get('uploadType') === 'resumable'
      )
    ).toBe(true)
    expect(
      api.requests.filter(({ url }) => new URL(url).hostname === 'upload.test')
        .length
    ).toBeGreaterThan(1)
  })

  it('resumes a transiently interrupted resumable upload', async () => {
    const api = new MockGoogleDriveApi()
    const adapter = createAdapter(api, emptyMappingReader, 1)
    const bytes = Buffer.alloc(300_000, 9)
    const hash = createHash('sha256').update(bytes).digest('hex')
    api.queueResponse('session-', new Response('{}', { status: 503 }))

    await expect(
      adapter.createAsset(`assets/${hash}.bin`, bytes, hash)
    ).resolves.toMatchObject({ providerObjectId: expect.any(String) })
    expect(
      api.requests.filter(
        ({ url, init }) =>
          new URL(url).hostname === 'upload.test' &&
          new Headers(init.headers).get('content-range')?.startsWith('bytes */')
      )
    ).toHaveLength(1)
  })
  it('rejects a transfer whose completed remote bytes are corrupt', async () => {
    const api = new MockGoogleDriveApi()
    const adapter = createAdapter(api)
    const bytes = Buffer.from('valid asset')
    const hash = createHash('sha256').update(bytes).digest('hex')
    api.corruptNextDownload(Buffer.from('corrupt asset'))

    await expect(
      adapter.createAsset(`assets/${hash}.bin`, bytes, hash)
    ).rejects.toMatchObject({ kind: SyncProviderErrorKindEnum.Permanent })
  })

  it('rejects malformed NoteStack metadata without classifying foreign files', async () => {
    const api = new MockGoogleDriveApi()
    const adapter = createAdapter(api)
    api.seedMetadata({
      name: 'foreign',
      parents: [GOOGLE_DRIVE_APP_DATA_FOLDER],
    })
    api.seedMetadata({
      name: 'corrupt',
      parents: [GOOGLE_DRIVE_APP_DATA_FOLDER],
      appProperties: {
        [googleDriveAppPropertyKeys.role]: googleDriveAppPropertyRoles.object,
        [googleDriveAppPropertyKeys.workspaceId]: workspaceId,
      },
    })

    await expect(adapter.enumerateObjects()).rejects.toMatchObject({
      kind: SyncProviderErrorKindEnum.Permanent,
    })
  })
})

describe('GoogleDriveHttpClient error classification', () => {
  const cases: Array<{
    status: number
    reason?: string
    kind: SyncProviderErrorKindEnum
  }> = [
    { status: 401, kind: SyncProviderErrorKindEnum.Authentication },
    {
      status: 403,
      reason: 'userRateLimitExceeded',
      kind: SyncProviderErrorKindEnum.Throttled,
    },
    {
      status: 403,
      reason: 'storageQuotaExceeded',
      kind: SyncProviderErrorKindEnum.Quota,
    },
    { status: 404, kind: SyncProviderErrorKindEnum.NotFound },
    { status: 408, kind: SyncProviderErrorKindEnum.Transient },
    { status: 412, kind: SyncProviderErrorKindEnum.PreconditionFailed },
    { status: 429, kind: SyncProviderErrorKindEnum.Throttled },
    { status: 503, kind: SyncProviderErrorKindEnum.Transient },
  ]

  for (const testCase of cases) {
    it(`maps status ${testCase.status} to ${testCase.kind}`, async () => {
      const api = new MockGoogleDriveApi()
      api.queueResponse(
        '/about',
        new Response(
          JSON.stringify({
            error: { errors: [{ reason: testCase.reason }] },
          }),
          {
            status: testCase.status,
            headers: { 'retry-after': '12' },
          }
        )
      )
      const client = new GoogleDriveHttpClient(() => 'token', api.fetch)

      await expect(
        client.request('https://www.googleapis.com/drive/v3/about')
      ).rejects.toMatchObject({
        kind: testCase.kind,
        retryAfterMs: 12_000,
      })
    })
  }

  it('keeps non-cursor change-feed bad requests permanent', async () => {
    const api = new MockGoogleDriveApi()
    api.queueResponse(
      '/changes',
      new Response(
        JSON.stringify({
          error: { errors: [{ reason: 'badRequest' }] },
        }),
        { status: 400 }
      )
    )
    const adapter = createAdapter(api)

    await expect(adapter.listChanges('0')).rejects.toMatchObject({
      kind: SyncProviderErrorKindEnum.Permanent,
    })
  })
  it('maps an expired change token to InvalidCursor', async () => {
    const api = new MockGoogleDriveApi()
    api.queueResponse('/changes', new Response('{}', { status: 410 }))
    const adapter = createAdapter(api)

    await expect(adapter.listChanges('0')).rejects.toMatchObject({
      kind: SyncProviderErrorKindEnum.InvalidCursor,
    })
  })

  it('normalizes rejected credential suppliers without leaking their errors', async () => {
    const client = new GoogleDriveHttpClient(
      () => Promise.reject(new Error('refresh-token-secret')),
      fetch
    )

    const error = await client
      .request('https://www.googleapis.com/drive/v3/about')
      .catch((value: unknown) => value)

    expect(error).toMatchObject({
      kind: SyncProviderErrorKindEnum.Authentication,
    })
    expect(String(error)).not.toContain('refresh-token-secret')
  })
  it('maps network failures to Transient without leaking credentials', async () => {
    const api = new MockGoogleDriveApi()
    api.queueResponse('/about', new Error('token secret leaked'))
    const client = new GoogleDriveHttpClient(() => 'private-token', api.fetch)

    const error = await client
      .request('https://www.googleapis.com/drive/v3/about')
      .catch((value: unknown) => value)

    expect(error).toMatchObject({ kind: SyncProviderErrorKindEnum.Transient })
    expect(String(error)).not.toContain('private-token')
    expect(String(error)).not.toContain('secret leaked')
  })
})
