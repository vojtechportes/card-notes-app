import { ApiProperty } from '@nestjs/swagger'

export class LabelDto {
  @ApiProperty({ type: String, description: 'Stable label id.' })
  id: string

  @ApiProperty({ type: String, description: 'Human-readable label title.' })
  title: string

  @ApiProperty({
    type: String,
    description: 'Source-scoped unique label name.',
  })
  name: string

  @ApiProperty({
    type: String,
    pattern: '^#[0-9A-Fa-f]{6}$',
    description: 'Label color as a hexadecimal RGB value.',
  })
  color: string

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Owning note type id, or null for a shared label.',
  })
  noteTypeId: string | null

  @ApiProperty({
    type: String,
    description: 'Timestamp when the label was created.',
  })
  createdAt: string

  @ApiProperty({
    type: String,
    description: 'Timestamp when the label was last updated.',
  })
  updatedAt: string
}
