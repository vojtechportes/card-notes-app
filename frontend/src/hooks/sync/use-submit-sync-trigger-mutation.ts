import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitSyncTrigger } from '../../api/sync/requests'
import type { SyncTriggerDto } from '../../types/api'
import { invalidateSynchronizedData } from './invalidate-synchronized-data.util'

export const useSubmitSyncTriggerMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (trigger: SyncTriggerDto) =>
      submitSyncTrigger(trigger).then((response) => response.data),
    onSuccess: () => invalidateSynchronizedData(queryClient),
  })
}
