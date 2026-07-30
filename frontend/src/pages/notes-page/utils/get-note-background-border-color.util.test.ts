import { describe, expect, it } from 'vitest'
import { getNoteBackgroundBorderColor } from './get-note-background-border-color.util'

describe('getNoteBackgroundBorderColor', () => {
  it('mixes the mapped note background with 20% black', () => {
    expect(getNoteBackgroundBorderColor('PEACH')).toBe(
      'color-mix(in srgb, #F7DFC2, black 20%)'
    )
  })

  it('uses the white fallback for null backgrounds', () => {
    expect(getNoteBackgroundBorderColor(null)).toBe(
      'color-mix(in srgb, #FFFFFF, black 20%)'
    )
  })
})
