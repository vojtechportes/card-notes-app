import { describe, expect, it } from 'vitest';
import { getBreakpoint } from './get-breakpoint.util';

describe('getBreakpoint', () => {
  it('resolves the active breakpoint from the viewport width', () => {
    expect(getBreakpoint({ xs: 1 }, 320)).toBe('xs');
    expect(getBreakpoint({ xs: 1 }, 768)).toBe('md');
    expect(getBreakpoint({ xs: 1 }, 1280)).toBe('xl');
  });
});