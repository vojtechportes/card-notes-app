import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthStatusDto } from './types/health-status.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Verify that the backend is running' })
  @ApiOkResponse({
    description: 'Backend health status.',
    type: HealthStatusDto,
  })
  getHealth(): HealthStatusDto {
    return this.healthService.getStatus();
  }
}
