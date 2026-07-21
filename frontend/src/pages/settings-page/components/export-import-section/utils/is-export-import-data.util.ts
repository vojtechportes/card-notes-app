import type { ExportImportFileData } from '../types/export-import-file-data'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const isExportImportData = (
  value: unknown
): value is ExportImportFileData => {
  if (!isRecord(value)) {
    return false
  }

  const hasSupportedVersion = value.version === 2 || value.version === 3
  const hasExpectedLabels = value.version === 2 || Array.isArray(value.labels)

  return (
    hasSupportedVersion &&
    hasExpectedLabels &&
    typeof value.exportedAt === 'string' &&
    Array.isArray(value.noteTypes) &&
    Array.isArray(value.columns) &&
    isRecord(value.generalSettings) &&
    Array.isArray(value.notes)
  )
}
