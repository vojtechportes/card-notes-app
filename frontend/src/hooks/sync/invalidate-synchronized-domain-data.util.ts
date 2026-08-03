import type { QueryClient } from '@tanstack/react-query'
import { notesQueryKeys } from '../../pages/notes-page/constants/notes-query-keys'
import { settingsQueryKeys } from '../../pages/settings-page/constants/settings-query-keys'

export const invalidateSynchronizedDomainData = (
  queryClient: QueryClient
): Promise<unknown[]> => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: notesQueryKeys.all() }),
    queryClient.invalidateQueries({ queryKey: settingsQueryKeys.all() }),
  ])
}
