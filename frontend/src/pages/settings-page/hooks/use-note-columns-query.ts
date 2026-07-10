import { useQuery } from '@tanstack/react-query'
import { getColumns } from '../../../api/settings/requests'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useNoteColumnsQuery = () => {
  return useQuery({
    queryKey: settingsQueryKeys.columns(),
    queryFn: ({ signal }) =>
      getColumns(signal).then((response) => response.data),
  })
}
