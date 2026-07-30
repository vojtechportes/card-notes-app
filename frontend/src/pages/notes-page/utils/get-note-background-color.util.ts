import type { BackgroundEnumDto } from '../../../types/api'

export const getNoteBackgroundColor = (
  background: BackgroundEnumDto | null
): string => {
  switch (background) {
    case 'CREAM':
      return '#FFFEE0'
    case 'LEMON':
      return '#F6F3A9'
    case 'LIME':
      return '#D1FED8'
    case 'PEACH':
      return '#F7DFC2'
    case 'MAUVE':
      return '#EBCCFF'
    case 'SKY':
      return '#BEDDF1'
    case 'FLESH':
      return '#F1BEB5'
    case 'VERDE':
      return '#9DD6AD'
    case 'ROUGE':
      return '#E99FAA'
    case 'TEAL':
      return '#89B1B1'
    case 'OCHRE':
      return '#D69759'
    case 'SILVER':
      return '#C0C0C0'
    case 'WHITE':
    case null:
      return '#FFFFFF'
  }
}
