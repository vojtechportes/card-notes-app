import { ApiPropertyOptional } from '@nestjs/swagger';

export class GeneralSettingsDto {
  @ApiPropertyOptional({ nullable: true, description: 'Optional number of text characters to display before truncation.' })
  textTruncationLength: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Optional number of configured fields to display on note cards.' })
  cardFieldDisplayCount: number | null;
}
