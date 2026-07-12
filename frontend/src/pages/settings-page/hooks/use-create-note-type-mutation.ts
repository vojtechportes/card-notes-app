import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createNoteType } from '../../../api/settings/requests'
import type { CreateNoteTypeDto } from '../../../types/api'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useCreateNoteTypeMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (noteType: CreateNoteTypeDto) =>
      createNoteType(noteType).then((response) => response.data),
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.noteTypes(),
      })
    },
  })
}
