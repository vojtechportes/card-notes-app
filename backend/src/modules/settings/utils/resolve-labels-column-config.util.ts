import { BadRequestException } from '@nestjs/common'
import type { LabelsColumnConfig } from '../types/labels-column-config'

export const resolveLabelsColumnConfig = (
  value: unknown,
  noteTypeExists: (noteTypeId: string) => boolean
): LabelsColumnConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Labels column config must be an object.')
  }

  const config = value as Record<string, unknown>
  const configKeys = Object.keys(config)

  if (
    configKeys.some((key) => !['allowMultiple', 'sources'].includes(key)) ||
    typeof config.allowMultiple !== 'boolean' ||
    !Object.prototype.hasOwnProperty.call(config, 'sources')
  ) {
    throw new BadRequestException('Labels column config is not valid.')
  }

  if (config.sources === null) {
    return {
      allowMultiple: config.allowMultiple,
      sources: null,
    }
  }

  if (
    !config.sources ||
    typeof config.sources !== 'object' ||
    Array.isArray(config.sources)
  ) {
    throw new BadRequestException(
      'Labels column sources must be an object or null.'
    )
  }

  const sources = config.sources as Record<string, unknown>
  const sourceKeys = Object.keys(sources)

  if (
    sourceKeys.some((key) => !['includeShared', 'noteTypeIds'].includes(key)) ||
    typeof sources.includeShared !== 'boolean' ||
    !Array.isArray(sources.noteTypeIds) ||
    sources.noteTypeIds.some((noteTypeId) => typeof noteTypeId !== 'string')
  ) {
    throw new BadRequestException('Labels column sources are not valid.')
  }

  const noteTypeIds = sources.noteTypeIds as string[]

  if (new Set(noteTypeIds).size !== noteTypeIds.length) {
    throw new BadRequestException(
      'Labels column sources cannot contain duplicate note type ids.'
    )
  }

  if (!sources.includeShared && noteTypeIds.length === 0) {
    throw new BadRequestException(
      'Explicit labels column sources must allow at least one source.'
    )
  }

  if (noteTypeIds.some((noteTypeId) => !noteTypeExists(noteTypeId))) {
    throw new BadRequestException(
      'Labels column sources contain an unknown note type id.'
    )
  }

  return {
    allowMultiple: config.allowMultiple,
    sources: {
      includeShared: sources.includeShared,
      noteTypeIds: [...noteTypeIds],
    },
  }
}
