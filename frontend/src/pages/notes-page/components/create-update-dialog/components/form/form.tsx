import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CreateUpdateDialogMode } from '../../create-update-dialog';

interface FormProps {
  mode: CreateUpdateDialogMode;
}

export const Form = ({ mode }: FormProps) => {
  const { t } = useTranslation();
  const descriptionKey =
    mode === 'create' ? 'notes.createDialog.description' : 'notes.updateDialog.description';

  return <Typography color="text.secondary">{t(descriptionKey)}</Typography>;
};
