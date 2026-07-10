import { describe, expect, it } from 'vitest'
import { getColumnCount } from './get-column-count.util'

describe('getColumnCount', () => {
  it('resolves responsive column counts from configured breakpoints', () => {
    const columns = { xs: 1, sm: 2, md: 3, lg: 4 }

    expect(getColumnCount(columns, 320)).toBe(1)
    expect(getColumnCount(columns, 600)).toBe(2)
    expect(getColumnCount(columns, 900)).toBe(3)
    expect(getColumnCount(columns, 1200)).toBe(4)
  })
})
