import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { invalidateSynchronizedDomainData } from '../../hooks/sync/invalidate-synchronized-domain-data.util'
import { useSyncStatusQuery } from '../../hooks/sync/use-sync-status-query'

export const SyncCacheObserver = () => {
  const queryClient = useQueryClient()
  const previousDataRevision = useRef<number | null>(null)
  const { data } = useSyncStatusQuery()

  useEffect(() => {
    if (!data) {
      return
    }

    const hasRevisionChanged =
      previousDataRevision.current !== null &&
      previousDataRevision.current !== data.dataRevision

    previousDataRevision.current = data.dataRevision
    if (hasRevisionChanged) {
      void invalidateSynchronizedDomainData(queryClient)
    }
  }, [data, queryClient])

  return null
}
