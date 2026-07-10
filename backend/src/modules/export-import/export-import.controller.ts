import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { ExportImportService } from './export-import.service'
import { ExportImportDataDto } from './types/export-import-data.dto'
import { ImportResultDto } from './types/import-result.dto'

const importFileFieldName = 'file'
const importFileSizeLimitInBytes = 50 * 1024 * 1024

@ApiTags('export-import')
@Controller('export-import')
export class ExportImportController {
  constructor(
    @Inject(ExportImportService)
    private readonly exportImportService: ExportImportService
  ) {}

  @Get('export')
  @ApiOperation({ summary: 'Export all application data' })
  @ApiOkResponse({
    description: 'All columns, general settings, and notes as JSON.',
    type: ExportImportDataDto,
  })
  exportData(): ExportImportDataDto {
    return this.exportImportService.exportData()
  }

  @Post('import')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor(importFileFieldName, {
      limits: {
        fileSize: importFileSizeLimitInBytes,
      },
    })
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import exported application data from a JSON file' })
  @ApiBody({
    schema: {
      type: 'object',
      required: [importFileFieldName],
      properties: {
        [importFileFieldName]: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Import result summary.',
    type: ImportResultDto,
  })
  importData(
    @UploadedFile() file?: { buffer?: Buffer; mimetype?: string }
  ): ImportResultDto {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Import file is required.')
    }

    if (file.mimetype && !this.isJsonMimeType(file.mimetype)) {
      throw new BadRequestException('Import file must be a JSON file.')
    }

    let payload: unknown

    try {
      payload = JSON.parse(file.buffer.toString('utf-8')) as unknown
    } catch {
      throw new BadRequestException('Import file must contain valid JSON.')
    }

    return this.exportImportService.importData(payload)
  }

  private isJsonMimeType(mimeType: string): boolean {
    return (
      mimeType === 'application/json' ||
      mimeType === 'text/json' ||
      mimeType === 'application/octet-stream'
    )
  }
}
