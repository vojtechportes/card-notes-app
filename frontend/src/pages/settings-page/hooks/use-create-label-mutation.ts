import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLabel } from '../../../api/settings/requests'
import type { CreateLabelDto } from '../../../types/api'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useCreateLabelMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (label: CreateLabelDto) =>
      createLabel(label).then((response) => response.data),
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.labels(),
      })
    },
  })
}
