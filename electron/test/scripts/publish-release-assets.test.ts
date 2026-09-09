import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import YAML from 'yaml'
import { publishReleaseAssets } from '../../scripts/publish-release-assets.util.mjs'

const version = '1.2.3'

const createReleaseFixture = async () => {
  const releaseRoot = await mkdtemp(path.join(tmpdir(), 'notestack-publish-'))
  const writeArtifact = async (name: string, content: string) => {
    const bytes = Buffer.from(content)

    await writeFile(path.join(releaseRoot, name), bytes)

    return {
      url: name,
      sha512: createHash('sha512').update(bytes).digest('base64'),
      size: bytes.length,
    }
  }
  const installer = await writeArtifact(
    `notestack-${version}-setup.exe`,
    'windows installer'
  )
  const x64Zip = await writeArtifact(`notestack-${version}-x64.zip`, 'x64 zip')
  const arm64Zip = await writeArtifact(
    `notestack-${version}-arm64.zip`,
    'arm64 zip'
  )

  await writeArtifact(`${installer.url}.blockmap`, 'blockmap')
  await writeArtifact(`notestack-${version}-x64.dmg`, 'x64 dmg')
  await writeArtifact(`notestack-${version}-arm64.dmg`, 'arm64 dmg')
  await writeFile(
    path.join(releaseRoot, 'latest.yml'),
    YAML.stringify({
      version,
      files: [installer],
      path: installer.url,
      sha512: installer.sha512,
    })
  )
  await writeFile(
    path.join(releaseRoot, 'latest-mac.yml'),
    YAML.stringify({
      version,
      files: [x64Zip, arm64Zip],
      path: x64Zip.url,
      sha512: x64Zip.sha512,
    })
  )

  return releaseRoot
}

const createGhHarness = (
  releaseRoot: string,
  options: {
    corruptDownloadAsset?: string
    duplicateAfterUpload?: boolean
    failUpload?: boolean
  } = {}
) => {
  let nextId = 10
  let assets = [
    { id: 1, name: 'unrelated-release-notes.txt' },
    { id: 2, name: 'latest.yml' },
  ]
  let uploadCompleted = false

  return {
    getAssetNames: () => assets.map((asset) => asset.name).sort(),
    runGh: async (argumentsList: string[]) => {
      if (argumentsList[0] === 'api' && argumentsList[1] === '--method') {
        const id = Number(argumentsList.at(-1)?.split('/').at(-1))

        assets = assets.filter((asset) => asset.id !== id)
        return ''
      }

      if (argumentsList[0] === 'api') {
        return JSON.stringify({ assets })
      }

      if (argumentsList[1] === 'upload') {
        if (options.failUpload) {
          throw new Error('simulated upload failure')
        }

        const repositoryFlagIndex = argumentsList.indexOf('--repo')
        const filePaths = argumentsList.slice(3, repositoryFlagIndex)

        assets.push(
          ...filePaths.map((filePath) => ({
            id: nextId++,
            name: path.basename(filePath),
          }))
        )
        uploadCompleted = true

        if (options.duplicateAfterUpload) {
          assets.push({ id: nextId++, name: path.basename(filePaths[0]) })
        }

        return ''
      }

      if (argumentsList[1] === 'download') {
        assert.equal(uploadCompleted, true)
        const pattern = argumentsList[argumentsList.indexOf('--pattern') + 1]
        const destinationRoot =
          argumentsList[argumentsList.indexOf('--dir') + 1]
        const destinationPath = path.join(destinationRoot, pattern)

        await mkdir(destinationRoot, { recursive: true })
        await copyFile(path.join(releaseRoot, pattern), destinationPath)

        if (pattern === options.corruptDownloadAsset) {
          await writeFile(destinationPath, 'substituted bytes')
        }

        return ''
      }

      throw new Error(`Unexpected gh arguments: ${argumentsList.join(' ')}`)
    },
  }
}

test('publishes exact assets idempotently without deleting unrelated assets', async () => {
  const releaseRoot = await createReleaseFixture()
  const harness = createGhHarness(releaseRoot)

  try {
    const firstAssets = await publishReleaseAssets({
      releaseRoot,
      repository: 'owner/repository',
      runGh: harness.runGh,
      tag: `v${version}`,
    })
    const secondAssets = await publishReleaseAssets({
      releaseRoot,
      repository: 'owner/repository',
      runGh: harness.runGh,
      tag: `v${version}`,
    })

    assert.deepEqual(secondAssets, firstAssets)
    assert.equal(
      harness.getAssetNames().filter((name) => name === 'latest.yml').length,
      1
    )
    assert.equal(
      harness.getAssetNames().includes('unrelated-release-notes.txt'),
      true
    )
  } finally {
    await rm(releaseRoot, { force: true, recursive: true })
  }
})

test('rolls back only exact expected assets after upload and verification failures', async (context) => {
  for (const failure of [
    { failUpload: true },
    { duplicateAfterUpload: true },
    { corruptDownloadAsset: `notestack-${version}-arm64.dmg` },
  ]) {
    await context.test(JSON.stringify(failure), async () => {
      const releaseRoot = await createReleaseFixture()
      const harness = createGhHarness(releaseRoot, failure)

      try {
        await assert.rejects(
          publishReleaseAssets({
            releaseRoot,
            repository: 'owner/repository',
            runGh: harness.runGh,
            tag: `v${version}`,
          }),
          /rolled back/
        )
        assert.deepEqual(harness.getAssetNames(), [
          'unrelated-release-notes.txt',
        ])
      } finally {
        await rm(releaseRoot, { force: true, recursive: true })
      }
    })
  }
})
