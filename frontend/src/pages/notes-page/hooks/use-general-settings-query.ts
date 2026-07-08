import { useQuery } from '@tanstack/react-query';
import { getGeneralSettings } from '../../../api/settings/requests';

const GENERAL_SETTINGS_QUERY_KEY = ['settings', 'general'] as const;

export const useGeneralSettingsQuery = () => {
  return useQuery({
    queryKey: GENERAL_SETTINGS_QUERY_KEY,
    queryFn: ({ signal }) => getGeneralSettings(signal).then((response) => response.data),
  });
};
