import { existsSync } from 'node:fs'
import path from 'node:path'

export const resolvePackagedLayout = ({
  electronRoot,
  platform = process.platform,
  unpackedRoot,
} = {}) => {
  if (!electronRoot) {
    throw new Error('electronRoot is required to resolve a packaged layout.')
  }

  if (platform === 'win32') {
    const applicationRoot = unpackedRoot
      ? path.resolve(unpackedRoot)
      : path.join(electronRoot, 'release', 'win-unpacked')

    return {
      applicationRoot,
      backendRoot: path.join(applicationRoot, 'resources', 'backend'),
      bundlePath: null,
      executablePath: path.join(applicationRoot, 'NoteStack.exe'),
      resourcesPath: path.join(applicationRoot, 'resources'),
    }
  }

  if (platform !== 'darwin') {
    throw new Error(`Unsupported packaged platform: ${platform}`)
  }

  const configuredRoot = unpackedRoot
    ? path.resolve(unpackedRoot)
    : path.join(electronRoot, 'release')
  const candidates = configuredRoot.endsWith('.app')
    ? [configuredRoot]
    : [
        path.join(configuredRoot, 'NoteStack.app'),
        path.join(configuredRoot, 'mac', 'NoteStack.app'),
        path.join(configuredRoot, 'mac-x64', 'NoteStack.app'),
        path.join(configuredRoot, 'mac-arm64', 'NoteStack.app'),
      ]
  const bundlePath = candidates.find((candidate) => existsSync(candidate))

  if (!bundlePath) {
    throw new Error(
      `The packaged NoteStack macOS bundle was not found below ${configuredRoot}.`
    )
  }

  const contentsPath = path.join(bundlePath, 'Contents')
  const resourcesPath = path.join(contentsPath, 'Resources')

  return {
    applicationRoot: bundlePath,
    backendRoot: path.join(resourcesPath, 'backend'),
    bundlePath,
    executablePath: path.join(contentsPath, 'MacOS', 'NoteStack'),
    resourcesPath,
  }
}
