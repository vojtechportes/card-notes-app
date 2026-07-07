import { ColumnTypeEnum } from '../types/column-type-enum';
import type { CreateColumnInput } from '../types/note-column';

export interface DefaultNoteColumn extends Required<Pick<CreateColumnInput, 'name' | 'title' | 'type'>> {
  id: string;
  sortOrder: number;
}

export const defaultNoteColumns: DefaultNoteColumn[] = [
  {
    id: '018fd90a-df5e-4b5f-95be-f27675db18f0',
    name: 'createdAt',
    title: 'Created at',
    type: ColumnTypeEnum.Date,
    sortOrder: 0,
  },
  {
    id: '018fd90a-e48b-4b99-a642-8c56ab85f5ce',
    name: 'updatedAt',
    title: 'Updated at',
    type: ColumnTypeEnum.Date,
    sortOrder: 1,
  },
];
