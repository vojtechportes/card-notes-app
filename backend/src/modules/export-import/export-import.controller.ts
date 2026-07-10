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
const jsonMimeTypes = new Set([
  'application/json',
  'text/json',
  'application/octet-stream',
])
const spreadsheetMimeTypes = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
])

interface ImportFile {
  buffer?: Buffer
  mimetype?: string
  originalname?: string
}

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
  @ApiOperation({ summary: 'Import application data from a JSON or XLSX file' })
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
  async importData(@UploadedFile() file?: ImportFile): Promise<ImportResultDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Import file is required.')
    }

    if (this.isSpreadsheetImportFile(file)) {
      return this.exportImportService.importSpreadsheetData(file.buffer)
    }

    if (!this.isJsonImportFile(file)) {
      throw new BadRequestException('Import file must be a JSON or XLSX file.')
    }

    let payload: unknown

    try {
      payload = JSON.parse(file.buffer.toString('utf-8')) as unknown
    } catch {
      throw new BadRequestException('Import file must contain valid JSON.')
    }

    return this.exportImportService.importData(payload)
  }

  private isJsonImportFile(file: ImportFile): boolean {
    const mimeType = file.mimetype?.toLowerCase()
    const originalName = file.originalname?.toLowerCase() ?? ''

    return Boolean(
      (mimeType && jsonMimeTypes.has(mimeType)) || originalName.endsWith('.json')
    )
  }

  private isSpreadsheetImportFile(file: ImportFile): boolean {
    const mimeType = file.mimetype?.toLowerCase()
    const originalName = file.originalname?.toLowerCase() ?? ''

    return Boolean(
      (mimeType && spreadsheetMimeTypes.has(mimeType)) ||
        originalName.endsWith('.xlsx')
    )
  }
}
