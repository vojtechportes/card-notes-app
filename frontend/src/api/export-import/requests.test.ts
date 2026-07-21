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
        labels: [],
        notes: [],
        noteTypes: [],
        version: 3,
      })
    )
    apiClientMock.get.mockReturnValue(response)

    const result = getExportData(signal)

    expect(result).toBe(response)
    expect(apiClientMock.get).toHaveBeenCalledWith('/export-import/export', {
      signal,
    })
  })

  it('imports app data as multipart form data with an optional target note type id', () => {
    const file = new File(['{"version":2}'], 'backup.json', {
      type: 'application/json',
    })
    const response = Promise.resolve(
      createResponse<ImportResultDto>({
        importedColumns: 0,
        importedLabels: 0,
        reusedLabels: 0,
        updatedGeneralSettings: true,
        importedNotes: 0,
        labelIssues: [],
        unmatchedFields: [],
      })
    )
    apiClientMock.postForm.mockReturnValue(response)

    const result = importData(file, 'note-type-1')

    expect(result).toBe(response)
    expect(apiClientMock.postForm).toHaveBeenCalledWith(
      '/export-import/import',
      { file, targetNoteTypeId: 'note-type-1' }
    )
  })
})
