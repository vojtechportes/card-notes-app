import { BREAKPOINTS, BREAKPOINTS_ORDER } from '../constants';
import type { BreakpointKey, ResponsiveColumns } from '../types';

export const getBreakpoint = (
  columns: number | ResponsiveColumns | undefined,
  windowWidth: number,
): BreakpointKey => {
  let resolved: BreakpointKey = 'xs';

  if (!columns) {
    return resolved;
  }

  for (const key of BREAKPOINTS_ORDER) {
    if (windowWidth >= BREAKPOINTS[key]) {
      resolved = key;
    }
  }

  return resolved;
};
