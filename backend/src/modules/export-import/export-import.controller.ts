import {
  BadRequestException,
  Body,
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

interface ImportDataBody {
  targetNoteTypeId?: unknown
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
    description: 'All note types, fields, general settings, and notes as JSON.',
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
        targetNoteTypeId: {
          type: 'string',
          nullable: true,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Import result summary.',
    type: ImportResultDto,
  })
  async importData(
    @UploadedFile() file?: ImportFile,
    @Body() body: ImportDataBody = {}
  ): Promise<ImportResultDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Import file is required.')
    }

    const targetNoteTypeId = this.resolveTargetNoteTypeId(body.targetNoteTypeId)

    if (this.isSpreadsheetImportFile(file)) {
      if (!targetNoteTypeId) {
        throw new BadRequestException(
          'XLSX imports require a target note type selection.'
        )
      }

      return this.exportImportService.importSpreadsheetData(
        file.buffer,
        targetNoteTypeId
      )
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

    return this.exportImportService.importData(payload, {
      targetNoteTypeId,
    })
  }

  private resolveTargetNoteTypeId(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined
    }

    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(
        'Import target note type id must be a non-empty string.'
      )
    }

    return value.trim()
  }

  private isJsonImportFile(file: ImportFile): boolean {
    const mimeType = file.mimetype?.toLowerCase()
    const originalName = file.originalname?.toLowerCase() ?? ''

    return Boolean(
      (mimeType && jsonMimeTypes.has(mimeType)) ||
      originalName.endsWith('.json')
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
