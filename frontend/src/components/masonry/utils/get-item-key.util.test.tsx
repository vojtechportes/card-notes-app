import { describe, expect, it } from 'vitest';
import { getItemKey } from './get-item-key.util';

describe('getItemKey', () => {
  it('uses a React element key when one is available', () => {
    expect(getItemKey(<span key="note-id" />, 3)).toBe('note-id');
  });

  it('uses the fallback index when the child does not have a key', () => {
    expect(getItemKey(<span />, 3)).toBe(3);
    expect(getItemKey('plain text', 4)).toBe(4);
  });
});