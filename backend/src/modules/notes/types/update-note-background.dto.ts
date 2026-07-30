import { ApiProperty } from '@nestjs/swagger'
import { BackgroundEnumDto } from './background-enum.dto'

export class UpdateNoteBackgroundDto {
  @ApiProperty({
    enum: BackgroundEnumDto,
    nullable: true,
    description: 'Enum-backed note background. Null resolves to white.',
  })
  background: BackgroundEnumDto | null
}
