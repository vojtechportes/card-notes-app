import type { ColumnTypeEnum } from './column-type-enum';

export interface NoteColumn {
  id: string;
  name: string;
  title: string;
  type: ColumnTypeEnum;
  sortOrder: number;
  isHidden: boolean;
  isDefault: boolean;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateColumnInput {
  name: string;
  title: string;
  type: ColumnTypeEnum;
  sortOrder?: number;
  isHidden?: boolean;
  config?: Record<string, unknown> | null;
}

export interface UpdateColumnInput {
  name?: string;
  title?: string;
  type?: ColumnTypeEnum;
  sortOrder?: number;
  isHidden?: boolean;
  config?: Record<string, unknown> | null;
}
