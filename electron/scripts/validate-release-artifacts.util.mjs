import { createHash } from 'node:crypto'
import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'

export const validateReleaseArtifacts = async ({
  platform,
  releaseRoot,
  version,
}) => {
  const manifestName = platform === 'darwin' ? 'latest-mac.yml' : 'latest.yml'
  const manifestPath = path.join(releaseRoot, manifestName)
  let manifest

  try {
    manifest = YAML.parse(await readFile(manifestPath, 'utf8'))
  } catch (error) {
    throw new Error(
      `The updater manifest was not found or invalid: ${manifestPath}`,
      {
        cause: error,
      }
    )
  }

  if (manifest.version !== version) {
    throw new Error(
      `${manifestName} version ${manifest.version} does not match ${version}.`
    )
  }

  if (platform === 'win32') {
    const fileEntries = manifest.files ?? []

    if (fileEntries.length !== 1 || fileEntries[0].url !== manifest.path) {
      throw new Error(
        'latest.yml must reference exactly one Windows installer.'
      )
    }

    const installerName = manifest.path
    const installerPath = path.join(releaseRoot, installerName)
    const blockMapPath = `${installerPath}.blockmap`

    await access(blockMapPath)
    const bytes = await readFile(installerPath)
    const stats = await stat(installerPath)
    const sha512 = createHash('sha512').update(bytes).digest('base64')

    if (
      fileEntries[0].sha512 !== sha512 ||
      manifest.sha512 !== sha512 ||
      fileEntries[0].size !== stats.size
    ) {
      throw new Error('latest.yml hash or size does not match the installer.')
    }

    return [manifestName, installerName, `${installerName}.blockmap`]
  }

  if (platform !== 'darwin') {
    throw new Error(`Unsupported release platform: ${platform}`)
  }

  const expectedArchitectures = ['x64', 'arm64']
  const fileEntries = manifest.files ?? []

  if (fileEntries.length !== expectedArchitectures.length) {
    throw new Error('latest-mac.yml must contain x64 and arm64 ZIP entries.')
  }

  const assets = [manifestName]

  for (const architecture of expectedArchitectures) {
    const matches = fileEntries.filter(
      (file) =>
        typeof file.url === 'string' &&
        file.url === `notestack-${version}-${architecture}.zip`
    )

    if (matches.length !== 1) {
      throw new Error(
        `latest-mac.yml must contain one ${architecture} ZIP entry.`
      )
    }

    const [file] = matches
    const zipPath = path.join(releaseRoot, file.url)
    const bytes = await readFile(zipPath)
    const stats = await stat(zipPath)
    const sha512 = createHash('sha512').update(bytes).digest('base64')

    if (file.sha512 !== sha512 || file.size !== stats.size) {
      throw new Error(`latest-mac.yml hash or size does not match ${file.url}.`)
    }

    const dmgName = `notestack-${version}-${architecture}.dmg`
    const dmgStats = await stat(path.join(releaseRoot, dmgName))

    if (dmgStats.size <= 0) {
      throw new Error(`${dmgName} is empty.`)
    }

    assets.push(file.url, dmgName)
  }

  if (
    manifest.path !== `notestack-${version}-x64.zip` ||
    manifest.sha512 !==
      fileEntries.find((file) => file.url.endsWith('-x64.zip'))?.sha512
  ) {
    throw new Error(
      'latest-mac.yml top-level path must use the x64 ZIP fallback.'
    )
  }

  return assets
}
