import { posix } from 'node:path'

export const normalizeXlsxPackagePath = (
  sourcePath: string,
  targetPath: string
): string => {
  if (targetPath.startsWith('/')) {
    return targetPath.replace(/^\/+/, '')
  }

  return posix.normalize(posix.join(posix.dirname(sourcePath), targetPath))
}
