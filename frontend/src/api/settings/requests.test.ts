import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ColumnDto,
  CreateColumnDto,
  DeleteColumnQueryDto,
  GeneralSettingsDto,
  ReorderColumnsDto,
  UpdateColumnDto,
  UpdateGeneralSettingsDto,
} from '../../types/api';
import {
  createColumn,
  deleteColumn,
  getColumns,
  getGeneralSettings,
  reorderColumns,
  updateColumn,
  updateGeneralSettings,
} from './requests';

const apiClientMock = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
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

  it('creates a note column', () => {
    const column: CreateColumnDto = {
      name: 'summary',
      title: 'Summary',
      type: 'text',
    };
    const response = Promise.resolve(createResponse<ColumnDto>({
      config: null,
      createdAt: '2026-07-08T10:00:00.000Z',
      id: 'column-1',
      isDefault: false,
      isHidden: false,
      name: 'summary',
      sortOrder: 2,
      title: 'Summary',
      type: 'text',
      updatedAt: '2026-07-08T10:00:00.000Z',
    }));
    apiClientMock.post.mockReturnValue(response);

    const result = createColumn(column);

    expect(result).toBe(response);
    expect(apiClientMock.post).toHaveBeenCalledWith('/settings/columns', column);
  });

  it('reorders note columns', () => {
    const columnOrder: ReorderColumnsDto = {
      columnIds: ['column-1', 'column-2'],
    };
    const response = Promise.resolve(createResponse<ColumnDto[]>([]));
    apiClientMock.patch.mockReturnValue(response);

    const result = reorderColumns(columnOrder);

    expect(result).toBe(response);
    expect(apiClientMock.patch).toHaveBeenCalledWith('/settings/columns/order', columnOrder);
  });

  it('updates a note column', () => {
    const column: UpdateColumnDto = {
      isHidden: true,
      title: 'Updated summary',
    };
    const response = Promise.resolve(createResponse<ColumnDto>({
      config: null,
      createdAt: '2026-07-08T10:00:00.000Z',
      id: 'column-1',
      isDefault: false,
      isHidden: true,
      name: 'summary',
      sortOrder: 2,
      title: 'Updated summary',
      type: 'text',
      updatedAt: '2026-07-08T10:15:00.000Z',
    }));
    apiClientMock.patch.mockReturnValue(response);

    const result = updateColumn('column-1', column);

    expect(result).toBe(response);
    expect(apiClientMock.patch).toHaveBeenCalledWith('/settings/columns/column-1', column);
  });

  it('deletes a note column with delete mode params', () => {
    const query: DeleteColumnQueryDto = {
      deleteMode: 'definitionAndValues',
    };
    const response = Promise.resolve(createResponse<void>(undefined));
    apiClientMock.delete.mockReturnValue(response);

    const result = deleteColumn('column-1', query);

    expect(result).toBe(response);
    expect(apiClientMock.delete).toHaveBeenCalledWith('/settings/columns/column-1', {
      params: query,
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

  it('updates general note card settings', () => {
    const settings: UpdateGeneralSettingsDto = {
      cardFieldDisplayCount: 4,
      textTruncationLength: 120,
    };
    const response = Promise.resolve(
      createResponse<GeneralSettingsDto>({
        cardFieldDisplayCount: 4,
        textTruncationLength: 120,
      }),
    );
    apiClientMock.patch.mockReturnValue(response);

    const result = updateGeneralSettings(settings);

    expect(result).toBe(response);
    expect(apiClientMock.patch).toHaveBeenCalledWith('/settings/general', settings);
  });
});
