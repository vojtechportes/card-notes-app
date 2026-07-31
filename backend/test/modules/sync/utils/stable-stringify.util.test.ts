import { describe, expect, it } from 'vitest'
import { stableStringify } from '../../../../src/modules/sync/utils/stable-stringify.util'

describe('stableStringify', () => {
  it('uses locale-independent code-unit ordering recursively', () => {
    expect(
      stableStringify({
        ['\u00e4']: 3,
        z: { ['\u03a9']: 2, A: 1 },
        A: 0,
      })
    ).toBe('{"A":0,"z":{"A":1,"\u03a9":2},"\u00e4":3}')
  })

  it('preserves array order while normalizing object keys', () => {
    expect(
      stableStringify([
        { b: 2, a: 1 },
        { d: 4, c: 3 },
      ])
    ).toBe('[{"a":1,"b":2},{"c":3,"d":4}]')
  })
})
