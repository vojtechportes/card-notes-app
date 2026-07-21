import { getContrastRatio } from '@mui/material/styles'
import { describe, expect, it } from 'vitest'
import { getAccessibleLabelChipTextColor } from './get-accessible-label-chip-text-color.util'

describe('getAccessibleLabelChipTextColor', () => {
  it.each(['#000000', '#FFFFFF', '#777777', '#0070F2', '#C35500', '#F5D90A'])(
    'chooses black or white with at least 4.5:1 contrast for %s',
    (backgroundColor) => {
      const textColor = getAccessibleLabelChipTextColor(backgroundColor)

      expect(['#000000', '#FFFFFF']).toContain(textColor)
      expect(
        getContrastRatio(backgroundColor, textColor)
      ).toBeGreaterThanOrEqual(4.5)
    }
  )
})
