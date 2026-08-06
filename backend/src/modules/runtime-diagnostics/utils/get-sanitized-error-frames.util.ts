const MAX_RUNTIME_DIAGNOSTIC_FRAMES = 8
const MAX_RUNTIME_DIAGNOSTIC_FRAME_LENGTH = 240
const backendFramePattern =
  /[\\/]backend[\\/](?:src|dist)[\\/](?<path>[a-z0-9_./\\-]+\.[cm]?[jt]s):(?<line>\d+):(?<column>\d+)\)?$/i

export const getSanitizedErrorFrames = (error: unknown): string[] => {
  if (!(error instanceof Error) || !error.stack) {
    return []
  }

  const frames: string[] = []

  for (const line of error.stack.split(/\r?\n/).slice(1)) {
    const match = backendFramePattern.exec(line.trim())
    const relativePath = match?.groups?.path
    const lineNumber = match?.groups?.line
    const columnNumber = match?.groups?.column

    if (!relativePath || !lineNumber || !columnNumber) {
      continue
    }

    const normalizedPath = relativePath.replace(/\\/g, '/')
    if (
      normalizedPath.includes('..') ||
      normalizedPath.length > MAX_RUNTIME_DIAGNOSTIC_FRAME_LENGTH
    ) {
      continue
    }

    frames.push(normalizedPath + ':' + lineNumber + ':' + columnNumber)
    if (frames.length === MAX_RUNTIME_DIAGNOSTIC_FRAMES) {
      break
    }
  }

  return frames
}
