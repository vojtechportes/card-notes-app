import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Form } from './components/form/form';

export type CreateUpdateDialogMode = 'create' | 'update';

interface CreateUpdateDialogProps {
  mode: CreateUpdateDialogMode;
  open: boolean;
  onClose: () => void;
}

export const CreateUpdateDialog = ({ mode, open, onClose }: CreateUpdateDialogProps) => {
  const { t } = useTranslation();
  const titleKey = mode === 'create' ? 'notes.createDialog.title' : 'notes.updateDialog.title';

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle>{t(titleKey)}</DialogTitle>
      <DialogContent>
        <Form mode={mode} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('notes.createUpdateDialog.actions.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};
