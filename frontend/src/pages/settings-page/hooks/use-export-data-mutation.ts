import { useMutation } from '@tanstack/react-query'
import { getExportData } from '../../../api/export-import/requests'

export const useExportDataMutation = () => {
  return useMutation({
    mutationFn: () => getExportData().then((response) => response.data),
  })
}
