import { useQuery } from '@tanstack/react-query'
import { getGeneralSettings } from '../../../api/settings/requests'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useGeneralSettingsQuery = () => {
  return useQuery({
    queryKey: settingsQueryKeys.general(),
    queryFn: ({ signal }) =>
      getGeneralSettings(signal).then((response) => response.data),
  })
}
