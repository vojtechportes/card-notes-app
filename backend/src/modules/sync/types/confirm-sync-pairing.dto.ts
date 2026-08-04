import { ApiProperty } from '@nestjs/swagger'
import { SyncPairingDecisionEnum } from './sync-pairing-decision-enum'

export class ConfirmSyncPairingDto {
  @ApiProperty({ enum: SyncPairingDecisionEnum })
  decision!: SyncPairingDecisionEnum
}
