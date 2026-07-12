import { useQuery } from '@tanstack/react-query'
import { getColumns } from '../../../api/settings/requests'
import { settingsQueryKeys } from '../constants/settings-query-keys'
import { useNoteTypesQuery } from './use-note-types-query'

export const useNoteColumnsQuery = (noteTypeId?: string) => {
  const noteTypesQuery = useNoteTypesQuery()
  const resolvedNoteTypeId = noteTypeId ?? noteTypesQuery.data?.[0]?.id
  const shouldResolveNoteType = !noteTypeId
  const columnsQuery = useQuery({
    enabled: Boolean(resolvedNoteTypeId),
    queryKey: settingsQueryKeys.columns(resolvedNoteTypeId),
    queryFn: ({ signal }) =>
      getColumns(resolvedNoteTypeId as string, signal).then(
        (response) => response.data
      ),
  })

  return {
    ...columnsQuery,
    isError:
      columnsQuery.isError || (shouldResolveNoteType && noteTypesQuery.isError),
    isLoading:
      columnsQuery.isLoading ||
      (shouldResolveNoteType && noteTypesQuery.isLoading),
  }
}
