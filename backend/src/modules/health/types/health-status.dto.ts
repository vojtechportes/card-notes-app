import { ApiProperty } from '@nestjs/swagger';

export class HealthStatusDto {
  @ApiProperty({ type: String, example: 'ok' })
  status!: 'ok';
}
