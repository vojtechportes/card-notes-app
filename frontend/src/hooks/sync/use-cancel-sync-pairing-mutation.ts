import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelSyncPairing } from '../../api/sync/requests'
import { invalidateSynchronizedData } from './invalidate-synchronized-data.util'

export const useCancelSyncPairingMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      cancelSyncPairing(id).then((response) => response.data),
    onSuccess: () => invalidateSynchronizedData(queryClient),
  })
}
