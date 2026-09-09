import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateReleaseArtifacts } from './validate-release-artifacts.util.mjs'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const electronRoot = path.resolve(dirname, '..')
const releaseRoot = process.env.ELECTRON_RELEASE_ROOT
  ? path.resolve(process.env.ELECTRON_RELEASE_ROOT)
  : path.join(electronRoot, 'release')
const platformArgument = process.argv.find((argument) =>
  argument.startsWith('--platform=')
)
const platform = platformArgument?.split('=')[1] ?? process.platform
const version =
  process.env.ELECTRON_RELEASE_VERSION ??
  JSON.parse(
    await import('node:fs/promises').then(({ readFile }) =>
      readFile(path.join(electronRoot, 'package.json'), 'utf8')
    )
  ).version
const assets = await validateReleaseArtifacts({
  platform,
  releaseRoot,
  version,
})

console.log(`Verified ${platform} Electron release artifacts:`)

for (const asset of assets) {
  console.log(`- ${asset}`)
}
