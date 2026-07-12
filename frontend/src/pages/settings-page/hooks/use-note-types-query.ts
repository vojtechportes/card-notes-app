import { useQuery } from '@tanstack/react-query'
import { getNoteTypes } from '../../../api/settings/requests'
import { settingsQueryKeys } from '../constants/settings-query-keys'

export const useNoteTypesQuery = () => {
  return useQuery({
    queryKey: settingsQueryKeys.noteTypes(),
    queryFn: ({ signal }) =>
      getNoteTypes(signal).then((response) => response.data),
  })
}
