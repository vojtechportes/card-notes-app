import type { QueryClient } from '@tanstack/react-query'
import { syncQueryKeys } from '../../constants/sync-query-keys'
import { invalidateSynchronizedDomainData } from './invalidate-synchronized-domain-data.util'

export const invalidateSynchronizedData = (
  queryClient: QueryClient
): Promise<unknown[]> => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: syncQueryKeys.all() }),
    invalidateSynchronizedDomainData(queryClient),
  ])
}
