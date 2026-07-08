import type { ColumnDto, NoteDto } from '../../../../../types/api';
import type { FormValues } from '../types/form-values';
import { normalizeDateInputValue } from './normalize-date-input-value.util';

export const getNoteFormDefaultValues = (
  columns: ColumnDto[],
  note?: NoteDto,
): FormValues => {
  const values = columns.reduce<FormValues['values']>((accumulator, column) => {
    const value = note?.values[column.id];

    if (column.type === 'image') {
      accumulator[column.id] =
        typeof value === 'object' && value !== null && !Array.isArray(value)
          ? value
          : null;
      return accumulator;
    }

    if (typeof value === 'number') {
      accumulator[column.id] = String(value);
      return accumulator;
    }

    if (typeof value === 'string') {
      accumulator[column.id] =
        column.type === 'date' ? normalizeDateInputValue(value) : value;
      return accumulator;
    }

    accumulator[column.id] = '';
    return accumulator;
  }, {});

  return { values };
};
