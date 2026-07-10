import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteAllNotes } from '../../../api/notes/requests'
import { notesQueryKeys } from '../../notes-page/constants/notes-query-keys'

export const useDeleteAllNotesMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteAllNotes().then((response) => response.data),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() })
    },
  })
}
