import { existsSync } from 'node:fs'
import type { BackendLogOpenResult } from '../types/backend-log-open-result.js'

export const openBackendLog = async (
  logPath: string,
  revealPath: (path: string) => void
): Promise<BackendLogOpenResult> => {
  if (!existsSync(logPath)) {
    return 'missing'
  }

  try {
    revealPath(logPath)
    return 'opened'
  } catch {
    return 'failed'
  }
}
