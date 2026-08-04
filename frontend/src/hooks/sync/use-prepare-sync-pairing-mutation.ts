import { useMutation } from '@tanstack/react-query'
import { prepareSyncPairing } from '../../api/sync/requests'
import type { PrepareSyncPairingDto } from '../../types/api'

export const usePrepareSyncPairingMutation = () => {
  return useMutation({
    mutationFn: (input: PrepareSyncPairingDto) =>
      prepareSyncPairing(input).then((response) => response.data),
  })
}
