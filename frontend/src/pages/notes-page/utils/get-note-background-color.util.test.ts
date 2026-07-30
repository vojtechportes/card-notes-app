import { describe, expect, it } from 'vitest'
import type { BackgroundEnumDto } from '../../../types/api'
import { getNoteBackgroundColor } from './get-note-background-color.util'

const expectedColors: Record<BackgroundEnumDto, string> = {
  CREAM: '#FFFEE0',
  LEMON: '#F6F3A9',
  LIME: '#D1FED8',
  PEACH: '#F7DFC2',
  MAUVE: '#EBCCFF',
  SKY: '#BEDDF1',
  FLESH: '#F1BEB5',
  VERDE: '#9DD6AD',
  ROUGE: '#E99FAA',
  TEAL: '#89B1B1',
  OCHRE: '#D69759',
  WHITE: '#FFFFFF',
  SILVER: '#C0C0C0',
}

describe('getNoteBackgroundColor', () => {
  it('maps every supported background enum to its configured color', () => {
    for (const [background, color] of Object.entries(expectedColors)) {
      expect(getNoteBackgroundColor(background as BackgroundEnumDto)).toBe(
        color
      )
    }
  })

  it('maps the backwards-compatible null background to white', () => {
    expect(getNoteBackgroundColor(null)).toBe('#FFFFFF')
  })
})
