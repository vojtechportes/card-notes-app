import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateLabel } from '../../../api/settings/requests'
import type { UpdateLabelDto } from '../../../types/api'
import { notesQueryKeys } from '../../notes-page/constants/notes-query-keys'
import { settingsQueryKeys } from '../constants/settings-query-keys'

interface UpdateLabelMutationVariables {
  id: string
  label: UpdateLabelDto
}

export const useUpdateLabelMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, label }: UpdateLabelMutationVariables) =>
      updateLabel(id, label).then((response) => response.data),
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
