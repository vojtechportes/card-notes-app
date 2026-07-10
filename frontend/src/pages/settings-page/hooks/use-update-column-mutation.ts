import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateColumn } from '../../../api/settings/requests'
import type { UpdateColumnDto } from '../../../types/api'
import { settingsQueryKeys } from '../constants/settings-query-keys'

interface UpdateColumnMutationVariables {
  id: string
  column: UpdateColumnDto
}

export const useUpdateColumnMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, column }: UpdateColumnMutationVariables) =>
      updateColumn(id, column).then((response) => response.data),
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.columns(),
      })
    },
  })
}
