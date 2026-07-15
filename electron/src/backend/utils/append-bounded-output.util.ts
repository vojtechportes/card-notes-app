export function appendBoundedOutput(
  currentOutput: string,
  nextOutput: string,
  maximumLength: number
): string {
  if (maximumLength <= 0) {
    return ''
  }

  return `${currentOutput}${nextOutput}`.slice(-maximumLength)
}
