import { useQuery } from '@tanstack/react-query'
import { getSyncStatus } from '../../api/sync/requests'
import { syncQueryKeys } from '../../constants/sync-query-keys'

export const useSyncStatusQuery = () => {
  return useQuery({
    queryKey: syncQueryKeys.status(),
    queryFn: ({ signal }) =>
      getSyncStatus(signal).then((response) => response.data),
    refetchInterval: (query) => (query.state.data?.isEnabled ? 2_000 : false),
    refetchIntervalInBackground: true,
  })
}
