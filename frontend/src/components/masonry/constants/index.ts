import type { BreakpointKey } from '../types';

export const BREAKPOINTS: Record<BreakpointKey, number> = {
  xs: 0,
  sm: 560,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export const BREAKPOINTS_ORDER: BreakpointKey[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
];
