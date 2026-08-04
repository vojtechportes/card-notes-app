import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SyncProviderEnum } from './sync-provider-enum'

export class SyncProviderAvailabilityDto {
  @ApiProperty({ enum: SyncProviderEnum })
  provider!: SyncProviderEnum

  @ApiProperty({ type: Boolean })
  available!: boolean

  @ApiPropertyOptional({ type: String })
  unavailableReasonCode?: string
}
