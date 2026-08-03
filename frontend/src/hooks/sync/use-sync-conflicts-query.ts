import { useQuery } from '@tanstack/react-query'
import { getSyncConflict, listSyncConflicts } from '../../api/sync/requests'
import { syncQueryKeys } from '../../constants/sync-query-keys'

export const useSyncConflictsQuery = () => {
  return useQuery({
    queryKey: syncQueryKeys.conflicts(),
    queryFn: ({ signal }) =>
      listSyncConflicts(signal).then((response) => response.data),
  })
}

export const useSyncConflictQuery = (id: string) => {
  return useQuery({
    queryKey: syncQueryKeys.conflict(id),
    queryFn: ({ signal }) =>
      getSyncConflict(id, signal).then((response) => response.data),
  })
}
