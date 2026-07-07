import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGeneralSettingsDto {
  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Optional number of text characters to display before truncation. Use null to unset.' })
  textTruncationLength?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Optional number of configured fields to display on note cards. Use null to unset.' })
  cardFieldDisplayCount?: number | null;
}
