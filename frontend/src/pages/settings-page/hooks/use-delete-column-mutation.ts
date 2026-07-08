import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteColumn } from '../../../api/settings/requests';
import type { DeleteColumnQueryDto } from '../../../types/api';
import { notesQueryKeys } from '../../notes-page/constants/notes-query-keys';
import { settingsQueryKeys } from '../constants/settings-query-keys';

interface DeleteColumnMutationVariables {
  id: string;
  query?: DeleteColumnQueryDto;
}

export const useDeleteColumnMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, query }: DeleteColumnMutationVariables) => deleteColumn(id, query).then((response) => response.data),
    onSuccess: (_data, variables) => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: settingsQueryKeys.columns() }),
      ];

      if (variables.query?.deleteMode === 'definitionAndValues') {
        invalidations.push(queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() }));
      }

      return Promise.all(invalidations);
    },
  });
};
