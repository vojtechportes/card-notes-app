import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateGeneralSettings } from '../../../api/settings/requests'
import type { UpdateGeneralSettingsDto } from '../../../types/api'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useUpdateGeneralSettingsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: UpdateGeneralSettingsDto) =>
      updateGeneralSettings(settings).then((response) => response.data),
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.general(),
      })
    },
  })
}
