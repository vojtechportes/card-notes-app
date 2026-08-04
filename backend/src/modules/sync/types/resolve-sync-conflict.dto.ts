import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SyncConflictResolutionStateEnum } from './sync-conflict-resolution-state-enum'

export class ResolveSyncConflictDto {
  @ApiProperty({
    enum: [
      SyncConflictResolutionStateEnum.ResolvedLocal,
      SyncConflictResolutionStateEnum.ResolvedRemote,
      SyncConflictResolutionStateEnum.ResolvedMerged,
    ],
  })
  resolutionState!: Exclude<
    SyncConflictResolutionStateEnum,
    SyncConflictResolutionStateEnum.Unresolved
  >

  @ApiPropertyOptional({ type: Object })
  mergedDocument?: Record<string, unknown>

  @ApiPropertyOptional({ type: Boolean })
  retainBoth?: boolean
}
