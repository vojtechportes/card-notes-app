import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SyncCommandEnum } from './sync-command-enum'
import { SyncProviderEnum } from './sync-provider-enum'

export class SyncCommandDto {
  @ApiProperty({ enum: SyncCommandEnum })
  command!: SyncCommandEnum

  @ApiPropertyOptional({ type: Boolean })
  confirmed?: boolean

  @ApiPropertyOptional({ enum: SyncProviderEnum })
  targetProvider?: SyncProviderEnum
}
