import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SyncErrorClassificationEnum } from './sync-error-classification-enum'
import { SyncProviderEnum } from './sync-provider-enum'
import { SyncStatusStateEnum } from './sync-status-state-enum'
import { SyncTriggerEnum } from './sync-trigger-enum'

export class SyncStatusDto {
  @ApiProperty({ enum: SyncStatusStateEnum })
  state!: SyncStatusStateEnum

  @ApiProperty({ type: Boolean })
  isEnabled!: boolean

  @ApiPropertyOptional({ enum: SyncProviderEnum, nullable: true })
  provider!: SyncProviderEnum | null

  @ApiPropertyOptional({ nullable: true, type: String })
  accountId!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  accountDisplayName!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  workspaceId!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  workspaceDisplayName!: string | null

  @ApiProperty({ type: Number })
  pendingMutationCount!: number

  @ApiProperty({ type: Number })
  unresolvedConflictCount!: number

  @ApiPropertyOptional({ nullable: true, type: String })
  lastAttemptedAt!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  lastSucceededAt!: string | null

  @ApiPropertyOptional({ enum: SyncErrorClassificationEnum, nullable: true })
  lastErrorClassification!: SyncErrorClassificationEnum | null

  @ApiPropertyOptional({ enum: SyncTriggerEnum, nullable: true })
  lastTrigger!: SyncTriggerEnum | null

  @ApiProperty({ type: Boolean })
  isStartupReady!: boolean

  @ApiProperty({ type: Number })
  dataRevision!: number
}
