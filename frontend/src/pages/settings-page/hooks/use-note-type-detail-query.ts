import { useQuery } from '@tanstack/react-query'
import { getNoteType } from '../../../api/settings/requests'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useNoteTypeDetailQuery = (noteTypeId?: string) => {
  return useQuery({
    enabled: Boolean(noteTypeId),
    queryKey: settingsQueryKeys.noteTypeDetail(noteTypeId),
    queryFn: ({ signal }) =>
      getNoteType(noteTypeId as string, signal).then((response) => response.data),
  })
}
