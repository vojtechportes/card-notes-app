import { ApiProperty } from '@nestjs/swagger'
import { SyncTriggerEnum } from './sync-trigger-enum'

export class SyncTriggerDto {
  @ApiProperty({ enum: SyncTriggerEnum })
  trigger!: SyncTriggerEnum
}
