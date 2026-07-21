import type { ExportImportDataDto } from '../../../../../types/api'

export type ExportImportFileData =
  | ExportImportDataDto
  | (Omit<ExportImportDataDto, 'labels' | 'version'> & {
      labels?: never
      version: 2
    })
