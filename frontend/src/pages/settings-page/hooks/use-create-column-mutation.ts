import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createColumn } from '../../../api/settings/requests'
import type { CreateColumnDto } from '../../../types/api'
import { settingsQueryKeys } from '../constants/settings-query-keys'

interface CreateColumnMutationVariables {
  column: CreateColumnDto
  noteTypeId: string
}

export const useCreateColumnMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ column, noteTypeId }: CreateColumnMutationVariables) =>
      createColumn(noteTypeId, column).then((response) => response.data),
    onSuccess: (_data, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.columns(variables.noteTypeId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.noteTypeDetail(variables.noteTypeId),
        }),
      ])
    },
  })
}
