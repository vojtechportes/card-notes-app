import { useMutation, useQueryClient } from '@tanstack/react-query'
import { confirmSyncPairing } from '../../api/sync/requests'
import type { ConfirmSyncPairingDto } from '../../types/api'
import { invalidateSynchronizedData } from './invalidate-synchronized-data.util'

interface ConfirmSyncPairingVariables {
  id: string
  input: ConfirmSyncPairingDto
}

export const useConfirmSyncPairingMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: ConfirmSyncPairingVariables) =>
      confirmSyncPairing(id, input).then((response) => response.data),
    onSuccess: () => invalidateSynchronizedData(queryClient),
  })
}
