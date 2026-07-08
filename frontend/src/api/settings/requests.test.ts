import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ColumnDto, GeneralSettingsDto } from '../../types/api';
import { getColumns, getGeneralSettings } from './requests';

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
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

describe('settings requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches configured note columns', () => {
    const signal = new AbortController().signal;
    const response = Promise.resolve(createResponse<ColumnDto[]>([]));
    apiClientMock.get.mockReturnValue(response);

    const result = getColumns(signal);

    expect(result).toBe(response);
    expect(apiClientMock.get).toHaveBeenCalledWith('/settings/columns', {
      signal,
    });
  });

  it('fetches general note card settings', () => {
    const signal = new AbortController().signal;
    const response = Promise.resolve(
      createResponse<GeneralSettingsDto>({
        cardFieldDisplayCount: null,
        textTruncationLength: null,
      }),
    );
    apiClientMock.get.mockReturnValue(response);

    const result = getGeneralSettings(signal);

    expect(result).toBe(response);
    expect(apiClientMock.get).toHaveBeenCalledWith('/settings/general', {
      signal,
    });
  });
});
