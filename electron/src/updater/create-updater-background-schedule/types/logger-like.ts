export interface LoggerLike {
  warn: (message: string, error?: unknown) => void
}
