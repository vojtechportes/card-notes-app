import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateLabelDto {
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

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Owning note type id, or null for a shared label.',
  })
  noteTypeId?: string | null
}
