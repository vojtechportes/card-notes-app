import type { GoogleDriveFetch } from '../../../../src/modules/sync/google-drive/types/google-drive-fetch'
import type { GoogleDriveFile } from '../../../../src/modules/sync/google-drive/types/google-drive-file'

interface StoredGoogleDriveFile {
  file: GoogleDriveFile
  bytes: Buffer
  etag: string
  deleted: boolean
}

interface StoredGoogleDriveChange {
  sequence: number
  fileId: string
  removed: boolean
  file?: GoogleDriveFile
}

interface ResumableSession {
  metadata: Record<string, unknown>
  bytes: Buffer
  totalSize: number
}

export class MockGoogleDriveApi {
  readonly requests: Array<{ url: string; init: RequestInit }> = []
  readonly fetch: GoogleDriveFetch
  private readonly files = new Map<string, StoredGoogleDriveFile>()
  private readonly changes: StoredGoogleDriveChange[] = []
  private readonly resumableSessions = new Map<string, ResumableSession>()
  private readonly queuedResponses: Array<{
    path: string
    response: Response | Error
  }> = []
  private nextId = 1
  private sequence = 0
  private minimumCursor = 0
  private corruptNextDownloadBytes: Buffer | null = null
  private createConcurrentDuplicate = false

  constructor(private readonly pageSize = 1) {
    this.fetch = this.handleFetch.bind(this) as GoogleDriveFetch
  }

  expireCursor(cursor: string): void {
    this.minimumCursor = Number(cursor) + 1
  }

  queueResponse(path: string, response: Response | Error): void {
    this.queuedResponses.push({ path, response })
  }

  deleteByLogicalKey(logicalKey: string): void {
    const stored = [...this.files.values()].find(
      ({ file }) => file.appProperties?.notestackLogicalKey === logicalKey
    )
    if (!stored || !stored.file.id) {
      return
    }

    stored.deleted = true
    this.sequence += 1
    this.changes.push({
      sequence: this.sequence,
      fileId: stored.file.id,
      removed: true,
    })
  }

  createDuplicateDuringNextCreate(): void {
    this.createConcurrentDuplicate = true
  }
  corruptNextDownload(bytes: Buffer): void {
    this.corruptNextDownloadBytes = Buffer.from(bytes)
  }

  seedMetadata(
    metadata: Record<string, unknown>,
    bytes = Buffer.alloc(0)
  ): void {
    this.storeFile(metadata, bytes)
  }
  corruptDownloadedBytes(logicalKey: string, bytes: Buffer): void {
    const stored = [...this.files.values()].find(
      ({ file }) => file.appProperties?.notestackLogicalKey === logicalKey
    )
    if (stored) {
      stored.bytes = Buffer.from(bytes)
    }
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

    if (url.hostname === 'upload.test') {
      return this.handleResumableChunk(url, init)
    }
    if (url.pathname.endsWith('/about')) {
      return this.jsonResponse({
        user: { permissionId: 'google-account', displayName: 'Google account' },
      })
    }
    if (url.pathname.endsWith('/changes/startPageToken')) {
      return this.jsonResponse({ startPageToken: String(this.sequence) })
    }
    if (url.pathname.endsWith('/changes')) {
      return this.handleChanges(url)
    }
    if (url.pathname.endsWith('/files') && init.method === 'POST') {
      if (url.searchParams.get('uploadType') === 'multipart') {
        return this.handleMultipartCreate(init)
      }
      if (url.searchParams.get('uploadType') === 'resumable') {
        return this.handleResumableStart(init)
      }

      return this.handleMetadataCreate(init)
    }
    if (url.pathname.endsWith('/files')) {
      return this.handleFileList(url)
    }

    const fileId = decodeURIComponent(url.pathname.split('/').at(-1) ?? '')
    if (init.method === 'PATCH') {
      return this.handleMultipartUpdate(fileId, init)
    }
    if (url.searchParams.get('alt') === 'media') {
      return this.handleDownload(fileId)
    }

    return this.handleFileGet(fileId)
  }

  private handleFileList(url: URL): Response {
    const query = url.searchParams.get('q') ?? ''
    const requiredProperties = [
      ...query.matchAll(/key='([^']+)' and value='([^']*)'/g),
    ].map((match) => [match[1], match[2].replaceAll("\\'", "'")] as const)
    const matching = [...this.files.values()]
      .filter(({ deleted }) => !deleted)
      .map(({ file }) => file)
      .filter((file) =>
        requiredProperties.every(
          ([key, value]) => file.appProperties?.[key] === value
        )
      )
      .sort((left, right) => (left.id ?? '').localeCompare(right.id ?? ''))
    const offset = Number(
      (url.searchParams.get('pageToken') ?? 'files:0').split(':').at(-1)
    )
    const files = matching.slice(offset, offset + this.pageSize)
    const nextOffset = offset + files.length

    return this.jsonResponse({
      files,
      nextPageToken:
        nextOffset < matching.length ? `files:${nextOffset}` : undefined,
    })
  }

  private handleChanges(url: URL): Response {
    const token = url.searchParams.get('pageToken') ?? ''
    const [cursorValue, offsetValue] = token.startsWith('changes:')
      ? token.slice('changes:'.length).split(':')
      : [token, '0']
    const cursor = Number(cursorValue)
    const offset = Number(offsetValue)
    if (
      !Number.isInteger(cursor) ||
      cursor < this.minimumCursor ||
      cursor > this.sequence
    ) {
      return this.jsonResponse(
        { error: { errors: [{ reason: 'pageTokenExpired' }] } },
        410
      )
    }

    const matching = this.changes.filter((change) => change.sequence > cursor)
    const changes = matching.slice(offset, offset + this.pageSize)
    const nextOffset = offset + changes.length

    return this.jsonResponse({
      changes: changes.map((change) => ({
        fileId: change.fileId,
        removed: change.removed,
        changeType: 'file',
        file: change.file,
      })),
      nextPageToken:
        nextOffset < matching.length
          ? `changes:${cursor}:${nextOffset}`
          : undefined,
      newStartPageToken:
        nextOffset >= matching.length ? String(this.sequence) : undefined,
    })
  }

  private handleFileGet(fileId: string): Response {
    const stored = this.files.get(fileId)
    if (!stored || stored.deleted) {
      return this.jsonResponse({}, 404)
    }

    return this.jsonResponse(stored.file, 200, { etag: stored.etag })
  }

  private handleDownload(fileId: string): Response {
    const stored = this.files.get(fileId)
    if (!stored || stored.deleted) {
      return this.jsonResponse({}, 404)
    }
    const expectedVersion = new Headers(this.requests.at(-1)?.init.headers).get(
      'if-match'
    )
    if (expectedVersion && expectedVersion !== stored.etag) {
      return this.jsonResponse({}, 412)
    }

    const bytes = this.corruptNextDownloadBytes ?? stored.bytes
    this.corruptNextDownloadBytes = null

    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': stored.file.mimeType ?? 'application/octet-stream',
      },
    })
  }

  private handleMetadataCreate(init: RequestInit): Response {
    const metadata = JSON.parse(String(init.body)) as Record<string, unknown>
    const stored = this.storeFile(metadata, Buffer.alloc(0))

    return this.jsonResponse(stored.file, 200, { etag: stored.etag })
  }

  private handleMultipartCreate(init: RequestInit): Response {
    const { metadata, bytes } = this.parseMultipart(init)
    if (this.createConcurrentDuplicate) {
      this.createConcurrentDuplicate = false
      this.storeFile(metadata, bytes)
    }
    const stored = this.storeFile(metadata, bytes)

    return this.jsonResponse(stored.file, 200, { etag: stored.etag })
  }

  private handleMultipartUpdate(fileId: string, init: RequestInit): Response {
    const stored = this.files.get(fileId)
    if (!stored || stored.deleted) {
      return this.jsonResponse({}, 404)
    }
    const expected = new Headers(init.headers).get('if-match')
    if (expected !== stored.etag) {
      return this.jsonResponse({}, 412)
    }

    const { metadata, bytes } = this.parseMultipart(init)
    const version = Number(stored.file.version ?? '0') + 1
    stored.file = this.createFile(fileId, metadata, bytes, version)
    stored.bytes = bytes
    stored.etag = `"etag-${fileId}-${version}"`
    this.recordChange(stored)

    return this.jsonResponse(stored.file, 200, { etag: stored.etag })
  }

  private handleResumableStart(init: RequestInit): Response {
    const metadata = JSON.parse(String(init.body)) as Record<string, unknown>
    const totalSize = Number(
      new Headers(init.headers).get('x-upload-content-length')
    )
    const sessionId = `session-${this.nextId}`
    this.resumableSessions.set(sessionId, {
      metadata,
      bytes: Buffer.alloc(0),
      totalSize,
    })

    return new Response(null, {
      status: 200,
      headers: { location: `https://upload.test/${sessionId}` },
    })
  }

  private handleResumableChunk(url: URL, init: RequestInit): Response {
    const sessionId = url.pathname.slice(1)
    const session = this.resumableSessions.get(sessionId)
    if (!session) {
      return this.jsonResponse({}, 404)
    }

    const contentRange = new Headers(init.headers).get('content-range') ?? ''
    if (contentRange.startsWith('bytes */')) {
      return new Response(null, {
        status: 308,
        headers:
          session.bytes.length > 0
            ? { range: `bytes=0-${session.bytes.length - 1}` }
            : {},
      })
    }

    const body = Buffer.isBuffer(init.body)
      ? Buffer.from(init.body)
      : Buffer.alloc(0)
    session.bytes = Buffer.concat([session.bytes, body])
    if (session.bytes.length < session.totalSize) {
      return new Response(null, {
        status: 308,
        headers: { range: `bytes=0-${session.bytes.length - 1}` },
      })
    }

    const stored = this.storeFile(session.metadata, session.bytes)
    this.resumableSessions.delete(sessionId)
    return this.jsonResponse(stored.file, 200, { etag: stored.etag })
  }

  private storeFile(
    metadata: Record<string, unknown>,
    bytes: Buffer
  ): StoredGoogleDriveFile {
    const fileId = `file-${this.nextId}`
    this.nextId += 1
    const stored: StoredGoogleDriveFile = {
      file: this.createFile(fileId, metadata, bytes, 1),
      bytes: Buffer.from(bytes),
      etag: `"etag-${fileId}-1"`,
      deleted: false,
    }
    this.files.set(fileId, stored)
    this.recordChange(stored)
    return stored
  }

  private createFile(
    fileId: string,
    metadata: Record<string, unknown>,
    bytes: Buffer,
    version: number
  ): GoogleDriveFile {
    return {
      id: fileId,
      name: typeof metadata.name === 'string' ? metadata.name : fileId,
      mimeType:
        typeof metadata.mimeType === 'string'
          ? metadata.mimeType
          : 'application/octet-stream',
      size: String(bytes.length),
      version: String(version),
      trashed: false,
      appProperties: metadata.appProperties as Record<string, string>,
    }
  }

  private recordChange(stored: StoredGoogleDriveFile): void {
    this.sequence += 1
    this.changes.push({
      sequence: this.sequence,
      fileId: stored.file.id!,
      removed: false,
      file: { ...stored.file },
    })
  }

  private parseMultipart(init: RequestInit): {
    metadata: Record<string, unknown>
    bytes: Buffer
  } {
    const contentType = new Headers(init.headers).get('content-type') ?? ''
    const boundary = /boundary=([^;]+)/.exec(contentType)?.[1]
    const body = Buffer.isBuffer(init.body)
      ? Buffer.from(init.body)
      : Buffer.alloc(0)
    if (!boundary) {
      throw new Error('Multipart boundary missing.')
    }

    const firstHeaderEnd = body.indexOf('\r\n\r\n')
    const metadataStart = firstHeaderEnd + 4
    const secondBoundary = body.indexOf(`\r\n--${boundary}`, metadataStart)
    const metadata = JSON.parse(
      body.subarray(metadataStart, secondBoundary).toString('utf8')
    ) as Record<string, unknown>
    const secondHeaderEnd = body.indexOf('\r\n\r\n', secondBoundary)
    const bytesStart = secondHeaderEnd + 4
    const finalBoundary = body.indexOf(`\r\n--${boundary}--`, bytesStart)

    return {
      metadata,
      bytes: body.subarray(bytesStart, finalBoundary),
    }
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
