import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExportImportDataDto, ImportResultDto } from '../../types/api';
import { getExportData, importData } from './requests';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../../utils/api-client', () => ({
  apiClient: apiClientMock,
}));

const createResponse = <TData,>(data: TData): AxiosResponse<TData> => {
  return {
    config: {} as AxiosResponse<TData>['config'],
    data,
    headers: {},
    status: 200,
    statusText: 'OK',
  };
};

describe('export-import requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports all app data', () => {
    const signal = new AbortController().signal;
    const response = Promise.resolve(createResponse<ExportImportDataDto>({
      columns: [],
      exportedAt: '2026-07-08T10:00:00.000Z',
      generalSettings: {
        cardFieldDisplayCount: null,
        textTruncationLength: null,
      },
      notes: [],
      version: 1,
    }));
    apiClientMock.get.mockReturnValue(response);

    const result = getExportData(signal);

    expect(result).toBe(response);
    expect(apiClientMock.get).toHaveBeenCalledWith('/export-import/export', {
      signal,
    });
  });

  it('imports app data', () => {
    const payload: ExportImportDataDto = {
      columns: [],
      exportedAt: '2026-07-08T10:00:00.000Z',
      generalSettings: {
        cardFieldDisplayCount: 3,
        textTruncationLength: 120,
      },
      notes: [],
      version: 1,
    };
    const response = Promise.resolve(createResponse<ImportResultDto>({
      importedColumns: 0,
      updatedGeneralSettings: true,
      importedNotes: 0,
    }));
    apiClientMock.post.mockReturnValue(response);

    const result = importData(payload);

    expect(result).toBe(response);
    expect(apiClientMock.post).toHaveBeenCalledWith('/export-import/import', payload);
  });
});

