import path from 'node:path'

export const getApplicationDataRoot = (appDataPath: string): string => {
  return path.join(appDataPath, 'card-notes-app')
}
