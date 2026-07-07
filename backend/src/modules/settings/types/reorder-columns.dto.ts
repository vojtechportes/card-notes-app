import { ApiProperty } from '@nestjs/swagger';

export class ReorderColumnsDto {
  @ApiProperty({ type: String, isArray: true, description: 'All column ids in the requested display order.' })
  columnIds: string[];
}
