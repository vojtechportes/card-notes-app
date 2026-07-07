import { BREAKPOINTS, BREAKPOINTS_ORDER } from '../constants';
import type { ResponsiveColumns } from '../types';

export const getColumnCount = (
  columns: number | ResponsiveColumns | undefined,
  windowWidth: number,
): number => {
  if (!columns) {
    return 1;
  }

  if (typeof columns === 'number') {
    return columns;
  }

  let resolved = columns.xs ?? 1;

  for (const key of BREAKPOINTS_ORDER) {
    const value = columns[key];

    if (value !== undefined && windowWidth >= BREAKPOINTS[key]) {
      resolved = value;
    }
  }

  return resolved;
};
