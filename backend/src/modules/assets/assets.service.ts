import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
} from 'node:path'
import { v4 as uuidV4 } from 'uuid'
import { getDefaultDataRoot } from '../database/utils/get-default-data-root.util'
import type { NoteImageValue, NoteValue } from '../notes/types/note-value'
import { AssetsRepository } from './assets.repository'
import {
  ASSET_DIRECTORY_NAME,
  MAX_ASSET_SIZE_BYTES,
} from './constants/asset-storage'
import type { AssetReference } from './types/asset-reference'
import type { AssetRecord } from './types/asset-record'
import type { StoreImageOptions } from './types/store-image-options'
import { detectImageMimeType } from './utils/detect-image-mime-type.util'
import { getImageExtension } from './utils/get-image-extension.util'
import { isAssetReference } from './utils/is-asset-reference.util'
import { parseImageDataUrl } from './utils/parse-image-data-url.util'

@Injectable()
export class AssetsService {
  private readonly dataRoot: string

  constructor(
    @Inject(AssetsRepository)
    private readonly assetsRepository: AssetsRepository
  ) {
    this.dataRoot = this.resolveDataRoot()
  }

  storeImage(buffer: Buffer, options: StoreImageOptions = {}): AssetReference {
    this.ensureValidSize(buffer)
    const mimeType = detectImageMimeType(buffer)

    if (!mimeType || (options.mimeType && options.mimeType !== mimeType)) {
      throw new BadRequestException(
        'Image bytes must match a supported PNG, JPEG, GIF, or WebP MIME type.'
      )
    }

    const extension = getImageExtension(mimeType) as string
    const assetId = createHash('sha256').update(buffer).digest('hex')
    const relativePath =
      ASSET_DIRECTORY_NAME +
      '/' +
      assetId.slice(0, 2) +
      '/' +
      assetId +
      '.' +
      extension
    const absolutePath = this.resolveManagedPath(relativePath)

    this.writeAtomically(absolutePath, assetId, buffer)
    this.assetsRepository.upsert({
      assetId,
      extension,
      integrityState: 'available',
      mimeType,
      relativePath,
      size: buffer.length,
    })

    return {
      assetId,
      altText: options.altText,
      fileName: this.resolveFileName(options.fileName, assetId, extension),
      height: options.height,
      mimeType,
      size: buffer.length,
      width: options.width,
    }
  }

  manageImageValue(value: NoteImageValue): NoteImageValue {
    if (isAssetReference(value)) {
      const record = this.requireAvailableRecord(value.assetId)

      if (record.mimeType !== value.mimeType || record.size !== value.size) {
        throw new BadRequestException('Managed image metadata is invalid.')
      }

      return value
    }

    if (typeof value.dataUrl === 'string') {
      const parsed = parseImageDataUrl(value.dataUrl)

      if (!parsed) {
        throw new BadRequestException('Image data URL is invalid.')
      }

      return this.storeImage(parsed.buffer, {
        ...this.getDisplayOptions(value),
        mimeType: parsed.mimeType,
      })
    }

    if (typeof value.path === 'string') {
      return this.importLocalPath(value.path, value)
    }

    if (typeof value.url === 'string' && /^https?:\/\//i.test(value.url)) {
      return value
    }

    throw new BadRequestException(
      'Image must use a managed or supported source.'
    )
  }

  manageNoteValue(value: NoteValue): NoteValue {
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === 'string')) {
        return value
      }

      return value.map((item) => this.manageImageValue(item))
    }

    if (value && typeof value === 'object') {
      return this.manageImageValue(value)
    }

    return value
  }

  materializeImageValue(value: NoteImageValue): NoteImageValue {
    if (!isAssetReference(value)) {
      if (typeof value.path === 'string') {
        return this.materializeImageValue(this.manageImageValue(value))
      }

      return value
    }

    const { buffer } = this.readAsset(value.assetId)

    return {
      altText: value.altText,
      dataUrl:
        'data:' + value.mimeType + ';base64,' + buffer.toString('base64'),
      fileName: value.fileName,
      height: value.height,
      mimeType: value.mimeType,
      size: value.size,
      width: value.width,
    }
  }

  materializeNoteValue(value: NoteValue): NoteValue {
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === 'string')) {
        return value
      }

      return value.map((item) => this.materializeImageValue(item))
    }

    if (value && typeof value === 'object') {
      return this.materializeImageValue(value)
    }

    return value
  }

  readAsset(assetId: string): { buffer: Buffer; record: AssetRecord } {
    if (!/^[a-f0-9]{64}$/.test(assetId)) {
      throw new BadRequestException('Asset id is invalid.')
    }

    const record = this.requireAvailableRecord(assetId)
    const absolutePath = this.resolveManagedPath(record.relativePath)

    if (!existsSync(absolutePath)) {
      this.assetsRepository.updateIntegrityState(assetId, 'missing')
      throw new BadRequestException('Managed asset is unavailable.')
    }

    const buffer = readFileSync(absolutePath)
    const actualHash = createHash('sha256').update(buffer).digest('hex')

    if (actualHash !== assetId || buffer.length !== record.size) {
      this.assetsRepository.updateIntegrityState(assetId, 'corrupt')
      throw new BadRequestException(
        'Managed asset failed integrity validation.'
      )
    }

    return { buffer, record }
  }

  private importLocalPath(path: string, value: NoteImageValue): AssetReference {
    if (!isAbsolute(path) || !existsSync(path) || !statSync(path).isFile()) {
      throw new BadRequestException('Local image path is unavailable.')
    }

    return this.storeImage(readFileSync(path), {
      ...this.getDisplayOptions(value),
      fileName: value.fileName ?? basename(path),
      mimeType: value.mimeType,
    })
  }

  private getDisplayOptions(value: NoteImageValue): StoreImageOptions {
    return {
      altText: value.altText,
      fileName: value.fileName,
      height: value.height,
      mimeType: value.mimeType,
      width: value.width,
    }
  }

  private requireAvailableRecord(assetId: string): AssetRecord {
    const record = this.assetsRepository.findById(assetId)

    if (!record || record.integrityState !== 'available') {
      throw new BadRequestException('Managed asset is unavailable.')
    }

    return record
  }

  private ensureValidSize(buffer: Buffer): void {
    if (buffer.length === 0 || buffer.length > MAX_ASSET_SIZE_BYTES) {
      throw new BadRequestException(
        'Image size must be between 1 and ' + MAX_ASSET_SIZE_BYTES + ' bytes.'
      )
    }
  }

  private writeAtomically(
    absolutePath: string,
    assetId: string,
    buffer: Buffer
  ): void {
    mkdirSync(dirname(absolutePath), { recursive: true })

    if (existsSync(absolutePath)) {
      const existingHash = createHash('sha256')
        .update(readFileSync(absolutePath))
        .digest('hex')

      if (existingHash !== assetId) {
        throw new BadRequestException('Managed asset destination is corrupt.')
      }

      return
    }

    const temporaryPath = absolutePath + '.' + uuidV4() + '.tmp'
    let descriptor: number | undefined

    try {
      descriptor = openSync(temporaryPath, 'wx')
      writeFileSync(descriptor, buffer)
      fsyncSync(descriptor)
      closeSync(descriptor)
      descriptor = undefined

      try {
        renameSync(temporaryPath, absolutePath)
      } catch (error) {
        if (!existsSync(absolutePath)) {
          throw error
        }

        rmSync(temporaryPath, { force: true })
      }
    } catch (error) {
      if (descriptor !== undefined) {
        closeSync(descriptor)
      }

      rmSync(temporaryPath, { force: true })
      throw error
    }
  }

  private resolveManagedPath(relativePath: string): string {
    const normalizedRoot = normalize(this.dataRoot)
    const absolutePath = normalize(join(normalizedRoot, relativePath))
    const relativePathFromRoot = relative(normalizedRoot, absolutePath)

    if (
      relativePathFromRoot.startsWith('..') ||
      isAbsolute(relativePathFromRoot)
    ) {
      throw new BadRequestException('Managed asset path is invalid.')
    }

    return absolutePath
  }

  private resolveDataRoot(): string {
    const dataRoot = process.env.CARD_NOTES_DATA_ROOT

    if (dataRoot) {
      return dataRoot
    }

    const databasePath = process.env.CARD_NOTES_DATABASE_PATH

    if (databasePath && databasePath !== ':memory:') {
      return dirname(databasePath)
    }

    return getDefaultDataRoot()
  }

  private resolveFileName(
    fileName: string | undefined,
    assetId: string,
    extension: string
  ): string {
    const safeName = fileName ? basename(fileName).trim() : ''
    return safeName || assetId + '.' + extension
  }
}
