import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumn } from '../../../api/settings/requests';
import type { CreateColumnDto } from '../../../types/api';
import { settingsQueryKeys } from '../constants/settings-query-keys';

export const useCreateColumnMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (column: CreateColumnDto) => createColumn(column).then((response) => response.data),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: settingsQueryKeys.columns() });
    },
  });
};
