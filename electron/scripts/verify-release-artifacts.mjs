import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const electronRoot = path.resolve(dirname, '..')
const releaseRoot = path.join(electronRoot, 'release')
const latestYmlPath = path.join(releaseRoot, 'latest.yml')

if (!existsSync(latestYmlPath)) {
  throw new Error(`The updater manifest was not found at ${latestYmlPath}.`)
}

const latestYmlContent = readFileSync(latestYmlPath, 'utf8')
const manifestPathMatch = latestYmlContent.match(/^path:\s+(.+)$/m)
const manifestUrlMatch = latestYmlContent.match(/^\s+-\s+url:\s+(.+)$/m)
const manifestVersionMatch = latestYmlContent.match(/^version:\s+(.+)$/m)
const manifestShaMatch = latestYmlContent.match(/^sha512:\s+(.+)$/m)

if (!manifestVersionMatch) {
  throw new Error('The updater manifest does not include a version field.')
}

if (!manifestPathMatch) {
  throw new Error('The updater manifest does not include a path entry for the installer.')
}

if (!manifestUrlMatch) {
  throw new Error('The updater manifest does not include a files[0].url entry for the installer.')
}

if (!manifestShaMatch) {
  throw new Error('The updater manifest does not include a top-level sha512 entry.')
}

const installerFileName = manifestPathMatch[1].trim()
const manifestInstallerUrl = manifestUrlMatch[1].trim()
const installerPath = path.join(releaseRoot, installerFileName)
const blockMapFileName = `${installerFileName}.blockmap`
const blockMapPath = path.join(releaseRoot, blockMapFileName)

if (manifestInstallerUrl !== installerFileName) {
  throw new Error(
    `The updater manifest url (${manifestInstallerUrl}) does not match the packaged installer (${installerFileName}).`
  )
}

if (!existsSync(installerPath)) {
  throw new Error(`The installer referenced by latest.yml was not found at ${installerPath}.`)
}

if (!existsSync(blockMapPath)) {
  throw new Error(`The updater blockmap referenced by latest.yml was not found at ${blockMapPath}.`)
}

console.log('Verified Electron release artifacts for auto-update publishing:')
console.log(`- installer: ${installerFileName}`)
console.log(`- blockmap: ${blockMapFileName}`)
console.log(`- manifest: latest.yml`)
console.log(`- manifest version: ${manifestVersionMatch[1].trim()}`)
