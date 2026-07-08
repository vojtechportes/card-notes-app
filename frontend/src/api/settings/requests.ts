import type { AxiosResponse } from 'axios';
import type {
  ColumnDto,
  CreateColumnDto,
  DeleteColumnQueryDto,
  GeneralSettingsDto,
  ReorderColumnsDto,
  UpdateColumnDto,
  UpdateGeneralSettingsDto,
} from '../../types/api';
import { apiClient } from '../../utils/api-client';

export const getColumns = (
  signal?: AbortSignal,
): Promise<AxiosResponse<ColumnDto[]>> => {
  return apiClient.get<ColumnDto[]>('/settings/columns', {
    signal,
  });
};

export const createColumn = (
  column: CreateColumnDto,
): Promise<AxiosResponse<ColumnDto>> => {
  return apiClient.post<ColumnDto>('/settings/columns', column);
};

export const reorderColumns = (
  columnOrder: ReorderColumnsDto,
): Promise<AxiosResponse<ColumnDto[]>> => {
  return apiClient.patch<ColumnDto[]>('/settings/columns/order', columnOrder);
};

export const updateColumn = (
  id: string,
  column: UpdateColumnDto,
): Promise<AxiosResponse<ColumnDto>> => {
  return apiClient.patch<ColumnDto>(`/settings/columns/${id}`, column);
};

export const deleteColumn = (
  id: string,
  query?: DeleteColumnQueryDto,
): Promise<AxiosResponse<void>> => {
  return apiClient.delete<void>(`/settings/columns/${id}`, {
    params: query,
  });
};

export const getGeneralSettings = (
  signal?: AbortSignal,
): Promise<AxiosResponse<GeneralSettingsDto>> => {
  return apiClient.get<GeneralSettingsDto>('/settings/general', {
    signal,
  });
};

export const updateGeneralSettings = (
  settings: UpdateGeneralSettingsDto,
): Promise<AxiosResponse<GeneralSettingsDto>> => {
  return apiClient.patch<GeneralSettingsDto>('/settings/general', settings);
};
