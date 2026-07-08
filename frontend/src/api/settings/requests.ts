import type { AxiosResponse } from 'axios';
import { apiClient } from '../../utils/api-client';
import type { ColumnDto, GeneralSettingsDto } from '../../types/api';

export const getColumns = (
  signal?: AbortSignal,
): Promise<AxiosResponse<ColumnDto[]>> => {
  return apiClient.get<ColumnDto[]>('/settings/columns', {
    signal,
  });
};

export const getGeneralSettings = (
  signal?: AbortSignal,
): Promise<AxiosResponse<GeneralSettingsDto>> => {
  return apiClient.get<GeneralSettingsDto>('/settings/general', {
    signal,
  });
};
