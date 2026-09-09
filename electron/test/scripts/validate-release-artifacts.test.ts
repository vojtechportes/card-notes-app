import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import YAML from 'yaml'
import { validateReleaseArtifacts } from '../../scripts/validate-release-artifacts.util.mjs'

const writeArtifact = async (root: string, name: string, content: string) => {
  const bytes = Buffer.from(content)

  await writeFile(path.join(root, name), bytes)

  return {
    sha512: createHash('sha512').update(bytes).digest('base64'),
    size: bytes.length,
    url: name,
  }
}

test('validates the complete dual-architecture macOS release set', async () => {
  const releaseRoot = await mkdtemp(
    path.join(tmpdir(), 'notestack-mac-release-')
  )

  try {
    const x64File = await writeArtifact(
      releaseRoot,
      'notestack-1.2.3-x64.zip',
      'x64 zip'
    )
    const arm64File = await writeArtifact(
      releaseRoot,
      'notestack-1.2.3-arm64.zip',
      'arm64 zip'
    )

    await writeArtifact(releaseRoot, 'notestack-1.2.3-x64.dmg', 'x64 dmg')
    await writeArtifact(releaseRoot, 'notestack-1.2.3-arm64.dmg', 'arm64 dmg')
    await writeFile(
      path.join(releaseRoot, 'latest-mac.yml'),
      YAML.stringify({
        version: '1.2.3',
        files: [x64File, arm64File],
        path: x64File.url,
        sha512: x64File.sha512,
      })
    )

    const assets = await validateReleaseArtifacts({
      platform: 'darwin',
      releaseRoot,
      version: '1.2.3',
    })

    assert.deepEqual(assets, [
      'latest-mac.yml',
      'notestack-1.2.3-x64.zip',
      'notestack-1.2.3-x64.dmg',
      'notestack-1.2.3-arm64.zip',
      'notestack-1.2.3-arm64.dmg',
    ])
  } finally {
    await rm(releaseRoot, { force: true, recursive: true })
  }
})

test('rejects a macOS updater hash mismatch', async () => {
  const releaseRoot = await mkdtemp(
    path.join(tmpdir(), 'notestack-mac-release-')
  )

  try {
    const x64File = await writeArtifact(
      releaseRoot,
      'notestack-1.2.3-x64.zip',
      'x64 zip'
    )
    const arm64File = await writeArtifact(
      releaseRoot,
      'notestack-1.2.3-arm64.zip',
      'arm64 zip'
    )

    await writeArtifact(releaseRoot, 'notestack-1.2.3-x64.dmg', 'x64 dmg')
    await writeArtifact(releaseRoot, 'notestack-1.2.3-arm64.dmg', 'arm64 dmg')
    await writeFile(
      path.join(releaseRoot, 'latest-mac.yml'),
      YAML.stringify({
        version: '1.2.3',
        files: [{ ...x64File, sha512: 'wrong' }, arm64File],
        path: x64File.url,
        sha512: 'wrong',
      })
    )

    await assert.rejects(
      validateReleaseArtifacts({
        platform: 'darwin',
        releaseRoot,
        version: '1.2.3',
      }),
      /hash or size/
    )
  } finally {
    await rm(releaseRoot, { force: true, recursive: true })
  }
})
