import type { OneDriveFetch } from '../../../../src/modules/sync/one-drive/types/one-drive-fetch'
import type { OneDriveItem } from '../../../../src/modules/sync/one-drive/types/one-drive-item'

interface StoredOneDriveItem {
  item: OneDriveItem
  bytes: Buffer
  deleted: boolean
}

interface StoredOneDriveChange {
  sequence: number
  item: OneDriveItem
}

interface OneDriveUploadState {
  name: string
  itemId?: string
  bytes: Buffer
  totalSize: number
}

export class MockOneDriveApi {
  readonly requests: Array<{ url: string; init: RequestInit }> = []
  readonly fetch: OneDriveFetch
  private readonly items = new Map<string, StoredOneDriveItem>()
  private readonly changes: StoredOneDriveChange[] = []
  private readonly uploadSessions = new Map<string, OneDriveUploadState>()
  private readonly queuedResponses: Array<{
    path: string
    response: Response | Error
  }> = []
  private nextId = 1
  private sequence = 0
  private minimumCursor = 0
  private corruptNextDownloadBytes: Buffer | null = null

  constructor(private readonly pageSize = 1) {
    this.fetch = this.handleFetch.bind(this) as OneDriveFetch
  }

  expireCursor(cursor: string): void {
    const parsed = new URL(cursor).searchParams.get('cursor')
    this.minimumCursor = Number(parsed) + 1
  }

  queueResponse(path: string, response: Response | Error): void {
    this.queuedResponses.push({ path, response })
  }

  corruptNextDownload(bytes: Buffer): void {
    this.corruptNextDownloadBytes = Buffer.from(bytes)
  }

  deleteByLogicalFileName(fileName: string): OneDriveItem | null {
    const stored = [...this.items.values()].find(
      ({ item, deleted }) => !deleted && item.name === fileName
    )
    if (!stored || !stored.item.id) {
      return null
    }

    stored.deleted = true
    const deletedItem: OneDriveItem = {
      id: stored.item.id,
      name: stored.item.name,
      eTag: stored.item.eTag,
      deleted: {},
      parentReference: { id: 'app-root' },
    }
    this.recordChange(deletedItem)

    return deletedItem
  }

  seedFile(name: string, bytes: Buffer): OneDriveItem {
    return this.storeFile(name, bytes).item
  }

  private async handleFetch(
    input: string | URL | globalThis.Request,
    init: RequestInit = {}
  ): Promise<Response> {
    const url = new URL(
      typeof input === 'string' || input instanceof URL ? input : input.url
    )
    this.requests.push({ url: url.toString(), init })

    const queuedIndex = this.queuedResponses.findIndex(({ path }) =>
      url.toString().includes(path)
    )
    if (queuedIndex >= 0) {
      const [queued] = this.queuedResponses.splice(queuedIndex, 1)
      if (queued.response instanceof Error) {
        throw queued.response
      }

      return queued.response
    }

    if (url.hostname === 'notestack-test.up.1drv.com') {
      return this.handleUpload(url, init)
    }
    if (url.pathname === '/v1.0/me/drive') {
      return this.jsonResponse({
        id: 'drive-id',
        owner: {
          user: { id: 'microsoft-account', displayName: 'Microsoft account' },
        },
      })
    }
    if (url.pathname.endsWith('/special/approot')) {
      return this.jsonResponse(this.createRootItem())
    }
    if (url.pathname.endsWith('/children')) {
      return this.handleChildren(url)
    }
    if (url.pathname.endsWith('/delta')) {
      return this.handleDelta(url)
    }
    if (url.pathname.endsWith('/createUploadSession')) {
      return this.handleUploadSession(url, init)
    }
    if (url.pathname.endsWith('/content')) {
      if (url.pathname.includes(':/')) {
        return this.handlePathContent(url, init)
      }

      const itemId = decodeURIComponent(
        url.pathname.split('/').slice(-2, -1)[0] ?? ''
      )
      return init.method === 'PUT'
        ? this.handleUpdate(itemId, init)
        : this.handleDownload(itemId, init)
    }

    const itemId = decodeURIComponent(url.pathname.split('/').at(-1) ?? '')

    return this.handleGetItem(itemId)
  }

  private handleChildren(url: URL): Response {
    const items = [...this.items.values()]
      .filter(({ deleted }) => !deleted)
      .map(({ item }) => item)
      .sort((left, right) => (left.id ?? '').localeCompare(right.id ?? ''))
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const page = items.slice(offset, offset + this.pageSize)
    const nextOffset = offset + page.length

    return this.jsonResponse({
      value: page,
      '@odata.nextLink':
        nextOffset < items.length
          ? `https://graph.microsoft.com/v1.0/me/drive/items/app-root/children?offset=${nextOffset}`
          : undefined,
    })
  }

  private handleDelta(url: URL): Response {
    const cursorValue = url.searchParams.get('cursor')
    const isInitial =
      cursorValue === null || url.searchParams.get('mode') === 'initial'
    const cursor = cursorValue === null ? null : Number(cursorValue)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    if (
      !isInitial &&
      cursor !== null &&
      (!Number.isInteger(cursor) ||
        cursor < this.minimumCursor ||
        cursor > this.sequence)
    ) {
      return this.jsonResponse({ error: { code: 'resyncRequired' } }, 410)
    }

    const snapshot = isInitial
      ? [...this.items.values()]
          .filter(({ deleted }) => !deleted)
          .map(({ item }) => item)
      : this.changes
          .filter((change) => change.sequence > cursor!)
          .map((change) => change.item)
    const page = snapshot.slice(offset, offset + this.pageSize)
    const nextOffset = offset + page.length
    const terminalCursor = isInitial
      ? Number(url.searchParams.get('snapshot') ?? this.sequence)
      : this.sequence
    const hasMore = nextOffset < snapshot.length
    let nextLink: string | undefined
    if (hasMore && isInitial) {
      nextLink = `https://graph.microsoft.com/v1.0/me/drive/items/app-root/delta?mode=initial&snapshot=${terminalCursor}&offset=${nextOffset}`
    } else if (hasMore) {
      nextLink = `https://graph.microsoft.com/v1.0/me/drive/items/app-root/delta?cursor=${cursor}&offset=${nextOffset}`
    }

    return this.jsonResponse({
      value: page,
      '@odata.nextLink': nextLink,
      '@odata.deltaLink': hasMore
        ? undefined
        : `https://graph.microsoft.com/v1.0/me/drive/items/app-root/delta?cursor=${terminalCursor}`,
    })
  }

  private handleGetItem(itemId: string): Response {
    if (itemId === 'app-root') {
      return this.jsonResponse(this.createRootItem())
    }

    const stored = this.items.get(itemId)
    if (!stored || stored.deleted) {
      return this.jsonResponse({}, 404)
    }

    return this.jsonResponse(stored.item, 200, { etag: stored.item.eTag! })
  }

  private handlePathContent(url: URL, init: RequestInit): Response {
    const encodedName = url.pathname.split(':/').at(-2) ?? ''
    const name = decodeURIComponent(encodedName)
    const existing = [...this.items.values()].find(
      ({ item, deleted }) => !deleted && item.name === name
    )
    if (existing && new Headers(init.headers).get('if-none-match') === '*') {
      return this.jsonResponse({ error: { code: 'nameAlreadyExists' } }, 412)
    }

    const bytes = Buffer.isBuffer(init.body)
      ? Buffer.from(init.body)
      : Buffer.from(String(init.body ?? ''))
    const stored = this.storeFile(name, bytes)

    return this.jsonResponse(stored.item, 201, { etag: stored.item.eTag! })
  }

  private handleUpdate(itemId: string, init: RequestInit): Response {
    const stored = this.items.get(itemId)
    if (!stored || stored.deleted) {
      return this.jsonResponse({}, 404)
    }
    const expectedVersion = new Headers(init.headers).get('if-match')
    if (expectedVersion !== stored.item.eTag) {
      return this.jsonResponse({}, 412)
    }

    stored.bytes = Buffer.isBuffer(init.body)
      ? Buffer.from(init.body)
      : Buffer.from(String(init.body ?? ''))
    const version = this.getVersion(stored.item.eTag) + 1
    stored.item = this.createItem(
      itemId,
      stored.item.name!,
      stored.bytes,
      version
    )
    this.recordChange({ ...stored.item })

    return this.jsonResponse(stored.item, 200, { etag: stored.item.eTag! })
  }

  private handleDownload(itemId: string, init: RequestInit): Response {
    const stored = this.items.get(itemId)
    if (!stored || stored.deleted) {
      return this.jsonResponse({}, 404)
    }
    const expectedVersion = new Headers(init.headers).get('if-match')
    if (expectedVersion && expectedVersion !== stored.item.eTag) {
      return this.jsonResponse({}, 412)
    }

    const bytes = this.corruptNextDownloadBytes ?? stored.bytes
    this.corruptNextDownloadBytes = null

    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type':
          stored.item.file?.mimeType ?? 'application/octet-stream',
      },
    })
  }

  private handleUploadSession(url: URL, init: RequestInit): Response {
    const body = JSON.parse(String(init.body)) as { item?: { name?: string } }
    const pathParts = url.pathname.split('/')
    const itemId = url.pathname.includes(':/createUploadSession')
      ? undefined
      : decodeURIComponent(pathParts.at(-2) ?? '')
    const existing = itemId ? this.items.get(itemId) : undefined
    const name = body.item?.name ?? existing?.item.name
    if (!name) {
      return this.jsonResponse({}, 400)
    }
    if (
      existing &&
      new Headers(init.headers).get('if-match') !== existing.item.eTag
    ) {
      return this.jsonResponse({}, 412)
    }

    const sessionId = `session-${this.nextId}`
    this.uploadSessions.set(sessionId, {
      name,
      itemId,
      bytes: Buffer.alloc(0),
      totalSize: 0,
    })

    return this.jsonResponse({
      uploadUrl: `https://notestack-test.up.1drv.com/${sessionId}`,
    })
  }

  private handleUpload(url: URL, init: RequestInit): Response {
    const session = this.uploadSessions.get(url.pathname.slice(1))
    if (!session) {
      return this.jsonResponse({}, 404)
    }
    if (init.method === 'GET') {
      return this.jsonResponse({
        nextExpectedRanges: [`${session.bytes.length}-`],
      })
    }

    const contentRange = new Headers(init.headers).get('content-range') ?? ''
    const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange)
    if (!match) {
      return this.jsonResponse({}, 400)
    }

    const offset = Number(match[1])
    const totalSize = Number(match[3])
    const chunk = Buffer.isBuffer(init.body)
      ? Buffer.from(init.body)
      : Buffer.alloc(0)
    if (offset !== session.bytes.length) {
      return this.jsonResponse({}, 416)
    }

    session.totalSize = totalSize
    session.bytes = Buffer.concat([session.bytes, chunk])
    if (session.bytes.length < totalSize) {
      return this.jsonResponse(
        { nextExpectedRanges: [`${session.bytes.length}-`] },
        202
      )
    }

    const stored = session.itemId
      ? this.updateStoredFile(session.itemId, session.bytes)
      : this.storeFile(session.name, session.bytes)
    this.uploadSessions.delete(url.pathname.slice(1))

    return this.jsonResponse(stored.item, 201, { etag: stored.item.eTag! })
  }

  private updateStoredFile(itemId: string, bytes: Buffer): StoredOneDriveItem {
    const stored = this.items.get(itemId)
    if (!stored || stored.deleted) {
      throw new Error('Mock upload session references a missing item.')
    }

    stored.bytes = Buffer.from(bytes)
    const version = this.getVersion(stored.item.eTag) + 1
    stored.item = this.createItem(itemId, stored.item.name!, bytes, version)
    this.recordChange({ ...stored.item })

    return stored
  }

  private storeFile(name: string, bytes: Buffer): StoredOneDriveItem {
    const itemId = `item-${this.nextId}`
    this.nextId += 1
    const stored: StoredOneDriveItem = {
      item: this.createItem(itemId, name, bytes, 1),
      bytes: Buffer.from(bytes),
      deleted: false,
    }
    this.items.set(itemId, stored)
    this.recordChange({ ...stored.item })

    return stored
  }

  private createItem(
    itemId: string,
    name: string,
    bytes: Buffer,
    version: number
  ): OneDriveItem {
    return {
      id: itemId,
      name,
      size: bytes.length,
      eTag: `\"etag-${itemId}-${version}\"`,
      file: { mimeType: 'application/octet-stream' },
      parentReference: { id: 'app-root', path: '/drive/special/approot' },
    }
  }

  private createRootItem(): OneDriveItem {
    return {
      id: 'app-root',
      name: 'NoteStack',
      eTag: '\"etag-app-root\"',
      folder: { childCount: this.items.size },
      parentReference: { driveId: 'microsoft-drive' },
    }
  }

  private recordChange(item: OneDriveItem): void {
    this.sequence += 1
    this.changes.push({ sequence: this.sequence, item })
  }

  private getVersion(etag: string | undefined): number {
    return Number(/-(\d+)\"$/.exec(etag ?? '')?.[1] ?? 0)
  }

  private jsonResponse(
    value: unknown,
    status = 200,
    headers: Record<string, string> = {}
  ): Response {
    return new Response(JSON.stringify(value), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    })
  }
}
