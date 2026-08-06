import { HttpStatus } from '@nestjs/common'

export const getRuntimeDiagnosticStatus = (value: unknown): number => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 400 ||
    value > 599
  ) {
    return HttpStatus.INTERNAL_SERVER_ERROR
  }

  return value
}
