import { useQuery } from '@tanstack/react-query'
import { getColumns } from '../../../api/settings/requests'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useNoteColumnsQuery = (noteTypeId?: string) => {
  return useQuery({
    enabled: Boolean(noteTypeId),
    queryKey: settingsQueryKeys.columns(noteTypeId),
    queryFn: ({ signal }) =>
      getColumns(noteTypeId as string, signal).then((response) => response.data),
  })
}
