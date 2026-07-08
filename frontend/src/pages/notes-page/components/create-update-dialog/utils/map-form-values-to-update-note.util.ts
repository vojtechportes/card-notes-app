import type { ColumnDto, UpdateNoteDto } from '../../../../../types/api';
import type { FormValues } from '../types/form-values';

export const mapFormValuesToUpdateNoteDto = (
  columns: ColumnDto[],
  formValues: FormValues,
): UpdateNoteDto => {
  const values = columns.reduce<NonNullable<UpdateNoteDto['values']>>(
    (accumulator, column) => {
      const value = formValues.values[column.id];

      if (column.type === 'image') {
        accumulator[column.id] = value;
        return accumulator;
      }

      if (typeof value !== 'string' || value.trim().length === 0) {
        accumulator[column.id] = null;
        return accumulator;
      }

      accumulator[column.id] = column.type === 'number' ? Number(value) : value;
      return accumulator;
    },
    {},
  );

  return { values };
};
