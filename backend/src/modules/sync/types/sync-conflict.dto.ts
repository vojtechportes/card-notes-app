import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SyncConflictResolutionStateEnum } from './sync-conflict-resolution-state-enum'
import { SyncConflictTypeEnum } from './sync-conflict-type-enum'
import { SyncEntityKindEnum } from './sync-entity-kind-enum'

export class SyncConflictDto {
  @ApiProperty({ type: String })
  id!: string

  @ApiProperty({ type: String })
  workspaceId!: string

  @ApiProperty({ enum: SyncEntityKindEnum })
  entityKind!: SyncEntityKindEnum

  @ApiPropertyOptional({ nullable: true, type: String })
  entityId!: string | null

  @ApiProperty({ enum: SyncConflictTypeEnum })
  conflictType!: SyncConflictTypeEnum

  @ApiProperty({ type: [String] })
  fieldPaths!: string[]

  @ApiPropertyOptional({ nullable: true, type: String })
  baseHash!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  localHash!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  remoteHash!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  baseDocumentJson!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  localDocumentJson!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  remoteDocumentJson!: string | null

  @ApiProperty({ enum: SyncConflictResolutionStateEnum })
  resolutionState!: SyncConflictResolutionStateEnum

  @ApiPropertyOptional({ nullable: true, type: String })
  conflictCopyEntityId!: string | null

  @ApiProperty({ type: String })
  createdAt!: string

  @ApiPropertyOptional({ nullable: true, type: String })
  resolvedAt!: string | null
}
