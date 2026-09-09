import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { resolvePackagedLayout } from '../../scripts/resolve-packaged-layout.util.mjs'

test('resolves the Windows unpacked layout', () => {
  const layout = resolvePackagedLayout({
    electronRoot: path.join('workspace', 'electron'),
    platform: 'win32',
    unpackedRoot: path.join('output', 'win-unpacked'),
  })

  assert.equal(layout.bundlePath, null)
  assert.match(layout.executablePath, /win-unpacked[\\/]NoteStack\.exe$/)
  assert.match(layout.backendRoot, /resources[\\/]backend$/)
})

test('resolves x64 and arm64 macOS app layouts', async () => {
  for (const directoryName of ['mac', 'mac-arm64']) {
    const root = await mkdtemp(path.join(tmpdir(), 'notestack-layout-'))
    const bundlePath = path.join(root, directoryName, 'NoteStack.app')

    try {
      await mkdir(bundlePath, { recursive: true })
      const layout = resolvePackagedLayout({
        electronRoot: root,
        platform: 'darwin',
        unpackedRoot: root,
      })

      assert.equal(layout.bundlePath, bundlePath)
      assert.equal(
        layout.executablePath,
        path.join(bundlePath, 'Contents', 'MacOS', 'NoteStack')
      )
      assert.equal(
        layout.backendRoot,
        path.join(bundlePath, 'Contents', 'Resources', 'backend')
      )
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  }
})

test('rejects missing and unsupported packaged layouts', () => {
  assert.throws(
    () =>
      resolvePackagedLayout({
        electronRoot: 'electron',
        platform: 'linux',
      }),
    /Unsupported packaged platform/
  )
  assert.throws(
    () =>
      resolvePackagedLayout({
        electronRoot: 'electron',
        platform: 'darwin',
        unpackedRoot: path.join('missing', 'bundle'),
      }),
    /macOS bundle was not found/
  )
})
