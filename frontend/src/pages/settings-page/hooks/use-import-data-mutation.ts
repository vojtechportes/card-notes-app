import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importData } from '../../../api/export-import/requests'
import type { ExportImportDataDto } from '../../../types/api'
import { notesQueryKeys } from '../../notes-page/constants/notes-query-keys'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useImportDataMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ExportImportDataDto) =>
      importData(data).then((response) => response.data),
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.columns(),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.general(),
        }),
        queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() }),
      ])
    },
  })
}
