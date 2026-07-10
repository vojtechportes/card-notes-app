import type { AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExportImportDataDto, ImportResultDto } from '../../types/api'
import { getExportData, importData } from './requests'

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  postForm: vi.fn(),
}))

vi.mock('../../utils/api-client', () => ({
  apiClient: apiClientMock,
}))

const createResponse = <TData>(data: TData): AxiosResponse<TData> => {
  return {
    config: {} as AxiosResponse<TData>['config'],
    data,
    headers: {},
    status: 200,
    statusText: 'OK',
  }
}

describe('export-import requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports all app data', () => {
    const signal = new AbortController().signal
    const response = Promise.resolve(
      createResponse<ExportImportDataDto>({
        columns: [],
        exportedAt: '2026-07-08T10:00:00.000Z',
        generalSettings: {
          cardFieldDisplayCount: null,
          textTruncationLength: null,
          mergeDateTimeFields: null,
        },
        notes: [],
        version: 1,
      })
    )
    apiClientMock.get.mockReturnValue(response)

    const result = getExportData(signal)

    expect(result).toBe(response)
    expect(apiClientMock.get).toHaveBeenCalledWith('/export-import/export', {
      signal,
    })
  })

  it('imports app data as multipart form data', () => {
    const file = new File(['{"version":1}'], 'backup.json', {
      type: 'application/json',
    })
    const response = Promise.resolve(
      createResponse<ImportResultDto>({
        importedColumns: 0,
        updatedGeneralSettings: true,
        importedNotes: 0,
      })
    )
    apiClientMock.postForm.mockReturnValue(response)

    const result = importData(file)

    expect(result).toBe(response)
    expect(apiClientMock.postForm).toHaveBeenCalledWith(
      '/export-import/import',
      { file }
    )
  })
})
