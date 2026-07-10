import { ApiProperty } from '@nestjs/swagger'
import { NoteDto } from '../../notes/types/note.dto'
import { ColumnDto } from '../../settings/types/column.dto'
import { GeneralSettingsDto } from '../../settings/types/general-settings.dto'

export class ExportImportDataDto {
  @ApiProperty({ type: Number, description: 'Export format version.' })
  version: number

  @ApiProperty({
    type: String,
    description: 'ISO timestamp when the export was created.',
  })
  exportedAt: string

  @ApiProperty({
    description: 'Exported note column definitions.',
    type: () => ColumnDto,
    isArray: true,
  })
  columns: ColumnDto[]

  @ApiProperty({
    description: 'Exported general settings.',
    type: () => GeneralSettingsDto,
  })
  generalSettings: GeneralSettingsDto

  @ApiProperty({
    description: 'Exported notes.',
    type: () => NoteDto,
    isArray: true,
  })
  notes: NoteDto[]
}
