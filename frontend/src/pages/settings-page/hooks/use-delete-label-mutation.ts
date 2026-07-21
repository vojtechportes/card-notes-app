import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteLabel } from '../../../api/settings/requests'
import { notesQueryKeys } from '../../notes-page/constants/notes-query-keys'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useDeleteLabelMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      deleteLabel(id).then((response) => response.data),
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.labels(),
        }),
        queryClient.invalidateQueries({ queryKey: notesQueryKeys.all() }),
      ])
    },
  })
}
