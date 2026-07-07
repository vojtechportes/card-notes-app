import { describe, expect, it } from 'vitest';
import { normalizeSize } from './normalize-size.util';

describe('normalizeSize', () => {
  it('normalizes numeric gaps to pixels', () => {
    expect(normalizeSize(12)).toBe('12px');
    expect(normalizeSize('1rem')).toBe('1rem');
  });
});