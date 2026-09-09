import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolvePackagedLayout } from './resolve-packaged-layout.util.mjs'

if (process.platform !== 'darwin') {
  throw new Error('macOS package verification must run on macOS.')
}

const architecture = process.env.NOTESTACK_PACKAGE_ARCH

if (architecture !== 'x64' && architecture !== 'arm64') {
  throw new Error('NOTESTACK_PACKAGE_ARCH must be x64 or arm64.')
}

const dirname = path.dirname(fileURLToPath(import.meta.url))
const electronRoot = path.resolve(dirname, '..')
const releaseRoot = process.env.ELECTRON_RELEASE_ROOT
  ? path.resolve(process.env.ELECTRON_RELEASE_ROOT)
  : path.join(electronRoot, 'release')
const layout = resolvePackagedLayout({
  electronRoot,
  platform: 'darwin',
  unpackedRoot: process.env.NOTESTACK_UNPACKED_ROOT ?? releaseRoot,
})
const expectedMachOArchitecture = architecture === 'x64' ? 'x86_64' : 'arm64'
const nativeModulePath = path.join(
  layout.backendRoot,
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  'better_sqlite3.node'
)
const version = JSON.parse(
  readFileSync(path.join(electronRoot, 'package.json'), 'utf8')
).version
const dmgPath = path.join(
  releaseRoot,
  `notestack-${version}-${architecture}.dmg`
)

for (const binaryPath of [layout.executablePath, nativeModulePath]) {
  if (!existsSync(binaryPath)) {
    throw new Error(`Packaged Mach-O file is missing: ${binaryPath}`)
  }

  const architectures = execFileSync('lipo', ['-archs', binaryPath], {
    encoding: 'utf8',
  })
    .trim()
    .split(/\s+/)

  if (
    architectures.length !== 1 ||
    architectures[0] !== expectedMachOArchitecture
  ) {
    throw new Error(
      `${binaryPath} has architectures ${architectures.join(', ')}, expected ${expectedMachOArchitecture}.`
    )
  }
}

execFileSync(
  'codesign',
  ['--verify', '--deep', '--strict', '--verbose=2', layout.bundlePath],
  { stdio: 'inherit' }
)
execFileSync(
  'spctl',
  ['--assess', '--type', 'execute', '--verbose=2', layout.bundlePath],
  { stdio: 'inherit' }
)
execFileSync('xcrun', ['stapler', 'validate', layout.bundlePath], {
  stdio: 'inherit',
})
execFileSync('xcrun', ['stapler', 'validate', dmgPath], { stdio: 'inherit' })
execFileSync(
  'spctl',
  [
    '--assess',
    '--type',
    'open',
    '--context',
    'context:primary-signature',
    '--verbose=2',
    dmgPath,
  ],
  { stdio: 'inherit' }
)
console.log(`Verified signed and notarized ${architecture} macOS package.`)
