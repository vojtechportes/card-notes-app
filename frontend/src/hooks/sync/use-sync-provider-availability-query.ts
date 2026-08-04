import { useQuery } from '@tanstack/react-query'
import { getSyncProviderAvailability } from '../../api/sync/requests'
import { syncQueryKeys } from '../../constants/sync-query-keys'

export const useSyncProviderAvailabilityQuery = () => {
  return useQuery({
    queryKey: syncQueryKeys.providers(),
    queryFn: ({ signal }) =>
      getSyncProviderAvailability(signal).then((response) => response.data),
  })
}
