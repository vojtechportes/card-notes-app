import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteNoteType } from '../../../api/settings/requests'
import type { DeleteNoteTypeDto } from '../../../types/api'
import { notesQueryKeys } from '../../notes-page/constants/notes-query-keys'
import { settingsQueryKeys } from '../constants/settings-query-keys'

interface DeleteNoteTypeMutationVariables {
  id: string
  noteType: DeleteNoteTypeDto
}

export const useDeleteNoteTypeMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, noteType }: DeleteNoteTypeMutationVariables) =>
      deleteNoteType(id, noteType).then((response) => response.data),
    onSuccess: (_data, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.noteTypes(),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.labels(),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.noteTypeDetail(variables.id),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.columns(variables.id),
        }),
        queryClient.invalidateQueries({
          queryKey: notesQueryKeys.lists(),
        }),
      ])
    },
  })
}
