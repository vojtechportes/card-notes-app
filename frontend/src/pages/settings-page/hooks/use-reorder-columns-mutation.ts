import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reorderColumns } from '../../../api/settings/requests'
import type { ReorderColumnsDto } from '../../../types/api'
import { settingsQueryKeys } from '../constants/settings-query-keys'

interface ReorderColumnsMutationVariables {
  columnOrder: ReorderColumnsDto
  noteTypeId: string
}

export const useReorderColumnsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ columnOrder, noteTypeId }: ReorderColumnsMutationVariables) =>
      reorderColumns(noteTypeId, columnOrder).then((response) => response.data),
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
