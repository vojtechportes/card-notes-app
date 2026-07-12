import type { ExportImportDataDto } from '../../../../../types/api'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const isExportImportData = (
  value: unknown
): value is ExportImportDataDto => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.version === 'number' &&
    typeof value.exportedAt === 'string' &&
    Array.isArray(value.noteTypes) &&
    Array.isArray(value.columns) &&
    isRecord(value.generalSettings) &&
    Array.isArray(value.notes)
  )
}
