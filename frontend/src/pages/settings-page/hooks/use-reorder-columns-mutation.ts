import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reorderColumns } from '../../../api/settings/requests';
import type { ReorderColumnsDto } from '../../../types/api';
import { settingsQueryKeys } from '../constants/settings-query-keys';

export const useReorderColumnsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnOrder: ReorderColumnsDto) => reorderColumns(columnOrder).then((response) => response.data),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: settingsQueryKeys.columns() });
    },
  });
};
