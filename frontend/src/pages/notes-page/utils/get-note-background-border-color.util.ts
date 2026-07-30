import type { BackgroundEnumDto } from '../../../types/api'
import { getNoteBackgroundColor } from './get-note-background-color.util'

export const getNoteBackgroundBorderColor = (
  background: BackgroundEnumDto | null
): string => {
  return `color-mix(in srgb, ${getNoteBackgroundColor(background)}, black 20%)`
}
