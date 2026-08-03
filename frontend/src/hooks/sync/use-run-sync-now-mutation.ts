import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runSyncNow } from '../../api/sync/requests'
import { invalidateSynchronizedData } from './invalidate-synchronized-data.util'

export const useRunSyncNowMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => runSyncNow().then((response) => response.data),
    onSuccess: () => invalidateSynchronizedData(queryClient),
  })
}
