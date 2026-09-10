import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeMacUpdateManifests } from '../../scripts/merge-mac-update-manifests.util.mjs'

const createManifest = (architecture: 'x64' | 'arm64') => ({
  version: '1.2.3',
  files: [
    {
      url: `notestack-1.2.3-${architecture}.zip`,
      sha512: `${architecture}-hash`,
      size: architecture === 'x64' ? 100 : 200,
    },
    {
      url: `notestack-1.2.3-${architecture}.dmg`,
      sha512: 'dmg-hash',
      size: 300,
    },
  ],
  releaseDate: `2026-09-0${architecture === 'x64' ? '8' : '9'}T00:00:00.000Z`,
})

test('merges architecture manifests deterministically for pinned MacUpdater selection', () => {
  const merged = mergeMacUpdateManifests([
    createManifest('arm64'),
    createManifest('x64'),
  ])

  assert.deepEqual(merged.files, [
    {
      url: 'notestack-1.2.3-x64.zip',
      sha512: 'x64-hash',
      size: 100,
    },
    {
      url: 'notestack-1.2.3-arm64.zip',
      sha512: 'arm64-hash',
      size: 200,
    },
  ])
  assert.equal(merged.path, 'notestack-1.2.3-x64.zip')
  assert.equal(merged.sha512, 'x64-hash')
  assert.equal(merged.releaseDate, '2026-09-09T00:00:00.000Z')
})

test('rejects missing, duplicate, and version-mismatched architecture entries', () => {
  assert.throws(
    () => mergeMacUpdateManifests([createManifest('x64')]),
    /Exactly two/
  )
  assert.throws(
    () =>
      mergeMacUpdateManifests([createManifest('x64'), createManifest('x64')]),
    /exactly one x64/
  )
  assert.throws(
    () =>
      mergeMacUpdateManifests([
        createManifest('x64'),
        { ...createManifest('arm64'), version: '1.2.4' },
      ]),
    /matching version/
  )
})
