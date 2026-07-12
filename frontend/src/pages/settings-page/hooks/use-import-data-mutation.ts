import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importData } from '../../../api/export-import/requests'
import { notesQueryKeys } from '../../notes-page/constants/notes-query-keys'
import { settingsQueryKeys } from '../constants/settings-query-keys'

interface ImportDataInput {
  file: File
  targetNoteTypeId?: string
}

export const useImportDataMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, targetNoteTypeId }: ImportDataInput) =>
      importData(file, targetNoteTypeId).then((response) => response.data),
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.all(),
        }),
        queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() }),
      ])
    },
  })
}
