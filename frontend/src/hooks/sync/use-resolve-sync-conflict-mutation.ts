import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resolveSyncConflict } from '../../api/sync/requests'
import type { ResolveSyncConflictDto } from '../../types/api'
import { invalidateSynchronizedData } from './invalidate-synchronized-data.util'

interface ResolveSyncConflictVariables {
  id: string
  resolution: ResolveSyncConflictDto
}

export const useResolveSyncConflictMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, resolution }: ResolveSyncConflictVariables) =>
      resolveSyncConflict(id, resolution).then((response) => response.data),
    onSuccess: () => invalidateSynchronizedData(queryClient),
  })
}
