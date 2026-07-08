import { useQuery } from '@tanstack/react-query';
import { getColumns } from '../../../api/settings/requests';

const NOTE_COLUMNS_QUERY_KEY = ['settings', 'columns'] as const;

export const useNoteColumnsQuery = () => {
  return useQuery({
    queryKey: NOTE_COLUMNS_QUERY_KEY,
    queryFn: ({ signal }) => getColumns(signal).then((response) => response.data),
  });
};
