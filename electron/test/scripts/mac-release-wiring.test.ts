import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const repositoryRoot = path.resolve(import.meta.dirname, '../../..')
const builderConfig = JSON.parse(
  readFileSync(
    path.join(repositoryRoot, 'electron/electron-builder.json'),
    'utf8'
  )
)
const workflow = readFileSync(
  path.join(repositoryRoot, '.github/workflows/release-electron.yml'),
  'utf8'
)
const rootPackage = JSON.parse(
  readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')
)
const electronPackage = JSON.parse(
  readFileSync(path.join(repositoryRoot, 'electron/package.json'), 'utf8')
)

test('preserves application identity and adds supported macOS packaging', () => {
  assert.equal(builderConfig.appId, 'com.cardnotes.app')
  assert.equal(builderConfig.productName, 'NoteStack')
  assert.equal(builderConfig.mac.minimumSystemVersion, '11.0')
  assert.equal(builderConfig.mac.category, 'public.app-category.productivity')
  assert.equal(builderConfig.mac.hardenedRuntime, true)
  assert.equal(builderConfig.mac.notarize, true)
  assert.equal(
    builderConfig.mac.artifactName,
    'notestack-${version}-${arch}.${ext}'
  )
  assert.deepEqual(
    builderConfig.mac.target.map((target: { target: string }) => target.target),
    ['dmg', 'zip']
  )
  assert.equal(
    builderConfig.win.artifactName,
    'notestack-${version}-setup.${ext}'
  )
})

test('keeps Windows aliases and exposes explicit architecture packaging commands', () => {
  assert.equal(electronPackage.scripts.package, 'npm run package:win')
  assert.equal(
    electronPackage.scripts['package:release'],
    'npm run package:win:release'
  )
  assert.equal(
    electronPackage.scripts['package:dir'],
    'npm run package:win:dir'
  )
  assert.match(electronPackage.scripts['package:mac:x64'], /--x64/)
  assert.match(electronPackage.scripts['package:mac:arm64'], /--arm64/)
  assert.match(rootPackage.scripts['package:mac:x64'], /package:mac:x64/)
  assert.match(rootPackage.scripts['package:mac:arm64'], /package:mac:arm64/)
})

test('wires isolated Mac jobs and one cross-platform final publisher', () => {
  assert.match(workflow, /runner: macos-15-intel/)
  assert.match(workflow, /runner: macos-15/)
  assert.match(workflow, /arch: x64/)
  assert.match(workflow, /arch: arm64/)
  assert.match(workflow, /prepare-windows-release-artifacts/)
  assert.match(workflow, /build-macos-release/)
  assert.match(workflow, /publish-electron-release/)
  assert.match(workflow, /latest-mac-x64\.yml/)
  assert.match(workflow, /latest-mac-arm64\.yml/)
  assert.match(workflow, /publish-release-assets\.mjs/)
  assert.match(workflow, /MACOS_CERTIFICATE_BASE64/)
  assert.match(workflow, /APPLE_API_KEY_BASE64/)
  assert.doesNotMatch(workflow, /^  publish-windows-installer:/m)
})
