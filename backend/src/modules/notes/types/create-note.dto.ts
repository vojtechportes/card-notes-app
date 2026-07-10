import { ApiPropertyOptional } from '@nestjs/swagger'

const noteValueSchema = {
  oneOf: [
    { type: 'string' },
    { type: 'number' },
    {
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
    },
  ],
}

export class CreateNoteDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: noteValueSchema,
    description: 'Structured note values keyed by note column id.',
  })
  values?: Record<string, unknown>
}
