import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExportImportService } from './export-import.service';
import { ExportImportDataDto } from './types/export-import-data.dto';
import { ImportResultDto } from './types/import-result.dto';

@ApiTags('export-import')
@Controller('export-import')
export class ExportImportController {
  constructor(@Inject(ExportImportService) private readonly exportImportService: ExportImportService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export all application data' })
  @ApiOkResponse({ description: 'All columns, general settings, and notes as JSON.', type: ExportImportDataDto })
  exportData(): ExportImportDataDto {
    return this.exportImportService.exportData();
  }

  @Post('import')
  @HttpCode(200)
  @ApiOperation({ summary: 'Import exported application data' })
  @ApiOkResponse({ description: 'Import result summary.', type: ImportResultDto })
  importData(@Body() body: ExportImportDataDto): ImportResultDto {
    return this.exportImportService.importData(body);
  }
}
