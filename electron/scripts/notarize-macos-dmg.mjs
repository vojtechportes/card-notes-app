import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertMacReleaseEnvironment } from './assert-mac-release-environment.util.mjs'

assertMacReleaseEnvironment(process.env)

const architecture = process.env.NOTESTACK_PACKAGE_ARCH

if (architecture !== 'x64' && architecture !== 'arm64') {
  throw new Error('NOTESTACK_PACKAGE_ARCH must be x64 or arm64.')
}

const dirname = path.dirname(fileURLToPath(import.meta.url))
const electronRoot = path.resolve(dirname, '..')
const releaseRoot = process.env.ELECTRON_RELEASE_ROOT
  ? path.resolve(process.env.ELECTRON_RELEASE_ROOT)
  : path.join(electronRoot, 'release')
const version = JSON.parse(
  await import('node:fs/promises').then(({ readFile }) =>
    readFile(path.join(electronRoot, 'package.json'), 'utf8')
  )
).version
const dmgPath = path.join(
  releaseRoot,
  `notestack-${version}-${architecture}.dmg`
)

execFileSync(
  'xcrun',
  [
    'notarytool',
    'submit',
    dmgPath,
    '--key',
    process.env.APPLE_API_KEY,
    '--key-id',
    process.env.APPLE_API_KEY_ID,
    '--issuer',
    process.env.APPLE_API_ISSUER,
    '--wait',
  ],
  { stdio: 'inherit' }
)
execFileSync('xcrun', ['stapler', 'staple', dmgPath], { stdio: 'inherit' })
console.log(`Notarized and stapled ${path.basename(dmgPath)}.`)
