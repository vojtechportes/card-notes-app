import { ApiProperty } from '@nestjs/swagger'
import { BackgroundEnumDto } from './background-enum.dto'

const imageValueSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    assetId: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    fileName: { type: 'string' },
    mimeType: { type: 'string' },
    size: { type: 'number' },
    dataUrl: { type: 'string' },
    path: { type: 'string' },
    url: { type: 'string' },
    altText: { type: 'string' },
    width: { type: 'number' },
    height: { type: 'number' },
  },
}

const noteValueSchema = {
  oneOf: [
    { type: 'string' },
    { type: 'number' },
    { type: 'array', items: { type: 'string' } },
    imageValueSchema,
    {
      type: 'array',
      items: imageValueSchema,
    },
  ],
}

export class NoteDto {
  @ApiProperty({ type: String, description: 'Stable note id.' })
  id: string

  @ApiProperty({ type: String, description: 'Owning note type id.' })
  noteTypeId: string

  @ApiProperty({
    enum: BackgroundEnumDto,
    enumName: 'BackgroundEnumDto',
    nullable: true,
    description: 'Enum-backed note background. Null resolves to white.',
  })
  background: BackgroundEnumDto | null

  @ApiProperty({
    type: 'object',
    additionalProperties: noteValueSchema,
    description: 'Structured note values keyed by note column id.',
  })
  values: Record<string, unknown>

  @ApiProperty({
    type: String,
    description: 'ISO timestamp when the note was created.',
  })
  createdAt: string

  @ApiProperty({
    type: String,
    description: 'ISO timestamp when the note was last updated.',
  })
  updatedAt: string
}
