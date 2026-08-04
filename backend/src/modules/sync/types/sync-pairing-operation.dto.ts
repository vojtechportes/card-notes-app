import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SyncPairingDecisionEnum } from './sync-pairing-decision-enum'
import { SyncPairingModeEnum } from './sync-pairing-mode-enum'
import { SyncPairingOperationTypeEnum } from './sync-pairing-operation-type-enum'
import { SyncPairingStatusEnum } from './sync-pairing-status-enum'
import { SyncProviderEnum } from './sync-provider-enum'

export class SyncPairingOperationDto {
  @ApiProperty({ type: String })
  id!: string

  @ApiProperty({ enum: SyncPairingOperationTypeEnum })
  operationType!: SyncPairingOperationTypeEnum

  @ApiProperty({ enum: SyncProviderEnum })
  targetProvider!: SyncProviderEnum

  @ApiProperty({ type: String })
  accountId!: string

  @ApiPropertyOptional({ nullable: true, type: String })
  accountDisplayName!: string | null

  @ApiProperty({ type: String })
  localWorkspaceId!: string

  @ApiPropertyOptional({ nullable: true, type: String })
  remoteWorkspaceId!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  remoteWorkspaceDisplayName!: string | null

  @ApiProperty({ enum: SyncPairingModeEnum })
  mode!: SyncPairingModeEnum

  @ApiProperty({ enum: SyncPairingStatusEnum })
  status!: SyncPairingStatusEnum

  @ApiProperty({ type: Boolean })
  localIsPopulated!: boolean

  @ApiProperty({ type: Boolean })
  remoteIsPopulated!: boolean

  @ApiProperty({ type: Number })
  pendingMutationCount!: number

  @ApiProperty({ type: Boolean })
  retainPendingWork!: boolean

  @ApiPropertyOptional({ enum: SyncProviderEnum, nullable: true })
  previousProvider!: SyncProviderEnum | null

  @ApiPropertyOptional({ nullable: true, type: String })
  previousAccountId!: string | null

  @ApiPropertyOptional({ nullable: true, type: String })
  backupPath!: string | null

  @ApiPropertyOptional({ enum: SyncPairingDecisionEnum, nullable: true })
  decision!: SyncPairingDecisionEnum | null

  @ApiPropertyOptional({ nullable: true, type: String })
  errorCode!: string | null

  @ApiProperty({ type: String })
  createdAt!: string

  @ApiProperty({ type: String })
  updatedAt!: string

  @ApiPropertyOptional({ nullable: true, type: String })
  completedAt!: string | null
}
