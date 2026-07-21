import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

const imageValueSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
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
export class CreateNoteDto {
  @ApiProperty({
    type: String,
    description: 'Owning note type id.',
  })
  noteTypeId: string

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: noteValueSchema,
    description: 'Structured note values keyed by note column id.',
  })
  values?: Record<string, unknown>
}
