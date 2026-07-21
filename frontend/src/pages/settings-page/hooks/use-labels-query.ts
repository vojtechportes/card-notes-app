import { useQuery } from '@tanstack/react-query'
import { getLabels } from '../../../api/settings/requests'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useLabelsQuery = () => {
  return useQuery({
    queryKey: settingsQueryKeys.labels(),
    queryFn: ({ signal }) =>
      getLabels(signal).then((response) => response.data),
  })
}
