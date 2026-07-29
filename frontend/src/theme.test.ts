import { describe, expect, it } from 'vitest'
import {
  mediumBreakpointMaxWidth,
  mediumDownMediaQuery,
  mediumUpMediaQuery,
  theme,
} from './theme'

describe('theme breakpoints', () => {
  it('keeps the medium breakpoint at 1060px with an inclusive compact range', () => {
    expect(mediumBreakpointMaxWidth).toBe(1060)
    expect(theme.breakpoints.values.md).toBe(1060)
    expect(theme.breakpoints.up('md')).toBe('@media (min-width:1060px)')
    expect(mediumDownMediaQuery).toBe('@media (width <= 1060px)')
    expect(mediumUpMediaQuery).toBe('@media (width > 1060px)')
  })
})
