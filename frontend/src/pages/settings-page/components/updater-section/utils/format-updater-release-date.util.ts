import { format, parseISO } from 'date-fns'
import { DATE_TIME_FORMAT } from '../../../../../constants/date-time-format'

export const formatUpdaterReleaseDate = (
  value: string | null
): string | null => {
  if (!value) {
    return null
  }

  const parsedValue = parseISO(value)

  if (Number.isNaN(parsedValue.getTime())) {
    return value
  }

  return format(parsedValue, DATE_TIME_FORMAT)
}
