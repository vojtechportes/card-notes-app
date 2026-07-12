import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateNoteType } from '../../../api/settings/requests'
import type { UpdateNoteTypeDto } from '../../../types/api'
import { settingsQueryKeys } from '../constants/settings-query-keys'

interface UpdateNoteTypeMutationVariables {
  id: string
  noteType: UpdateNoteTypeDto
}

export const useUpdateNoteTypeMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, noteType }: UpdateNoteTypeMutationVariables) =>
      updateNoteType(id, noteType).then((response) => response.data),
    onSuccess: (_data, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.noteTypes(),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.noteTypeDetail(variables.id),
        }),
      ])
    },
  })
}
