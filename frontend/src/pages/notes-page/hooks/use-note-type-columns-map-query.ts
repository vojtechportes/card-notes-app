import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getColumns } from '../../../api/settings/requests'
import type { ColumnDto } from '../../../types/api'
import { settingsQueryKeys } from '../../settings-page/constants/settings-query-keys'

export const useNoteTypeColumnsMapQuery = (noteTypeIds: string[]) => {
  const uniqueNoteTypeIds = useMemo(() => {
    return [...new Set(noteTypeIds)]
  }, [noteTypeIds])

  const queryResults = useQueries({
    queries: uniqueNoteTypeIds.map((noteTypeId) => ({
      enabled: Boolean(noteTypeId),
      queryKey: settingsQueryKeys.columns(noteTypeId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getColumns(noteTypeId, signal).then((response) => response.data),
    })),
  })

  const data = useMemo<Record<string, ColumnDto[]>>(() => {
    return uniqueNoteTypeIds.reduce<Record<string, ColumnDto[]>>(
      (accumulator, noteTypeId, index) => {
        const noteTypeColumns = queryResults[index]?.data

        if (noteTypeColumns) {
          accumulator[noteTypeId] = noteTypeColumns
        }

        return accumulator
      },
      {}
    )
  }, [queryResults, uniqueNoteTypeIds])

  return {
    data,
    isError: queryResults.some((result) => result.isError),
    isLoading: queryResults.some((result) => result.isLoading),
  }
}
