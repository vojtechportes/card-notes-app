import { Stack } from '@mui/material';
import type {
  Control,
  UseFormClearErrors,
  UseFormSetError,
} from 'react-hook-form';
import type { ColumnDto } from '../../../../../types/api';
import type { FormValues } from '../types/form-values';
import { NoteFormField } from './note-form-field';

interface NoteFormFieldsProps {
  clearErrors: UseFormClearErrors<FormValues>;
  columns: ColumnDto[];
  control: Control<FormValues>;
  setError: UseFormSetError<FormValues>;
}

export const NoteFormFields = ({
  clearErrors,
  columns,
  control,
  setError,
}: NoteFormFieldsProps) => {
  return (
    <Stack spacing={2}>
      {columns.map((column, index) => (
        <NoteFormField
          autoFocus={index === 0}
          clearErrors={clearErrors}
          column={column}
          control={control}
          key={column.id}
          setError={setError}
        />
      ))}
    </Stack>
  );
};
