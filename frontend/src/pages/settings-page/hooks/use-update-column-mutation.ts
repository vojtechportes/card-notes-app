import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateColumn } from '../../../api/settings/requests'
import type { UpdateColumnDto } from '../../../types/api'
import { settingsQueryKeys } from '../constants/settings-query-keys'

interface UpdateColumnMutationVariables {
  id: string
  column: UpdateColumnDto
  noteTypeId: string
}

export const useUpdateColumnMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, column, noteTypeId }: UpdateColumnMutationVariables) =>
      updateColumn(noteTypeId, id, column).then((response) => response.data),
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
