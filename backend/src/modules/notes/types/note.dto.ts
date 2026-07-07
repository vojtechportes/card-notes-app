import { ApiProperty } from '@nestjs/swagger';

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
};

export class NoteDto {
  @ApiProperty({ type: String, description: 'Stable note id.' })
  id: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: noteValueSchema,
    description: 'Structured note values keyed by note column id.',
  })
  values: Record<string, unknown>;

  @ApiProperty({ type: String, description: 'ISO timestamp when the note was created.' })
  createdAt: string;

  @ApiProperty({ type: String, description: 'ISO timestamp when the note was last updated.' })
  updatedAt: string;
}
