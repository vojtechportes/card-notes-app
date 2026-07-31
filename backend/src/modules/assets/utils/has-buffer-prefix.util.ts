export const hasBufferPrefix = (buffer: Buffer, prefix: number[]): boolean => {
  return prefix.every((value, index) => buffer[index] === value)
}
