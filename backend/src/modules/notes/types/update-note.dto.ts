import { ApiPropertyOptional } from '@nestjs/swagger'

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

const noteValuePatchSchema = {
  oneOf: [
    { type: 'string' },
    { type: 'number' },
    { type: 'null' },
    imageValueSchema,
    {
      type: 'array',
      items: imageValueSchema,
    },
  ],
}
export class UpdateNoteDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: noteValuePatchSchema,
    description:
      'Structured note value patch keyed by note column id. Use null to remove a value.',
  })
  values?: Record<string, unknown>
}
