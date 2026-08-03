import { useMutation, useQueryClient } from '@tanstack/react-query'
import { runSyncCommand } from '../../api/sync/requests'
import type { SyncCommandDto } from '../../types/api'
import { invalidateSynchronizedData } from './invalidate-synchronized-data.util'

export const useSyncCommandMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (command: SyncCommandDto) =>
      runSyncCommand(command).then((response) => response.data),
    onSuccess: () => invalidateSynchronizedData(queryClient),
  })
}
