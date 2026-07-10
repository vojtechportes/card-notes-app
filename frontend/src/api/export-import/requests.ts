import type { AxiosResponse } from 'axios'
import type { ExportImportDataDto, ImportResultDto } from '../../types/api'
import { apiClient } from '../../utils/api-client'

export const getExportData = (
  signal?: AbortSignal
): Promise<AxiosResponse<ExportImportDataDto>> => {
  return apiClient.get<ExportImportDataDto>('/export-import/export', {
    signal,
  })
}

export const importData = (
  file: File
): Promise<AxiosResponse<ImportResultDto>> => {
  return apiClient.postForm<ImportResultDto>('/export-import/import', {
    file,
  })
}
