import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { mergeMacUpdateManifests } from './merge-mac-update-manifests.util.mjs'

const [x64ManifestPath, arm64ManifestPath, outputPath] = process.argv.slice(2)

if (!x64ManifestPath || !arm64ManifestPath || !outputPath) {
  throw new Error(
    'Usage: merge-mac-update-manifests <x64-manifest> <arm64-manifest> <output>'
  )
}

const manifests = await Promise.all(
  [x64ManifestPath, arm64ManifestPath].map(async (manifestPath) =>
    YAML.parse(await readFile(path.resolve(manifestPath), 'utf8'))
  )
)
const mergedManifest = mergeMacUpdateManifests(manifests)

await writeFile(
  path.resolve(outputPath),
  YAML.stringify(mergedManifest),
  'utf8'
)
console.log(`Merged macOS updater manifest at ${path.resolve(outputPath)}.`)
