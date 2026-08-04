import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SyncProviderEnum } from './sync-provider-enum'

export class PrepareSyncPairingDto {
  @ApiProperty({ enum: SyncProviderEnum })
  provider!: SyncProviderEnum

  @ApiPropertyOptional({ type: String })
  expectedAccountId?: string

  @ApiPropertyOptional({ type: String })
  workspaceId?: string

  @ApiPropertyOptional({ type: Boolean, default: false })
  retainPendingWork?: boolean
}
