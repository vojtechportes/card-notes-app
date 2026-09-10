import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { compareReleaseArtifactBytes } from './compare-release-artifact-bytes.util.mjs'
import { validateReleaseArtifacts } from './validate-release-artifacts.util.mjs'

export const publishReleaseAssets = async ({
  releaseRoot,
  repository,
  runGh,
  tag,
}) => {
  const version = tag.startsWith('v') ? tag.slice(1) : tag
  const expectedAssets = [
    ...(await validateReleaseArtifacts({
      platform: 'win32',
      releaseRoot,
      version,
    })),
    ...(await validateReleaseArtifacts({
      platform: 'darwin',
      releaseRoot,
      version,
    })),
  ]
  const uniqueAssets = [...new Set(expectedAssets)]

  if (uniqueAssets.length !== expectedAssets.length) {
    throw new Error(
      'The cross-platform release asset plan contains duplicates.'
    )
  }

  const verificationRoot = await mkdtemp(
    path.join(tmpdir(), 'notestack-published-release-')
  )

  const readRelease = async () =>
    JSON.parse(await runGh(['api', `repos/${repository}/releases/tags/${tag}`]))
  const deleteExpectedAssets = async () => {
    const release = await readRelease()
    const matchingAssets = release.assets.filter((asset) =>
      uniqueAssets.includes(asset.name)
    )

    for (const asset of matchingAssets) {
      await runGh([
        'api',
        '--method',
        'DELETE',
        `repos/${repository}/releases/assets/${asset.id}`,
      ])
    }
  }

  try {
    await deleteExpectedAssets()

    await runGh([
      'release',
      'upload',
      tag,
      ...uniqueAssets.map((asset) => path.join(releaseRoot, asset)),
      '--repo',
      repository,
    ])

    const publishedRelease = await readRelease()

    for (const expectedAsset of uniqueAssets) {
      const matches = publishedRelease.assets.filter(
        (asset) => asset.name === expectedAsset
      )

      if (matches.length !== 1) {
        throw new Error(
          `Expected exactly one published ${expectedAsset} asset, found ${matches.length}.`
        )
      }

      await runGh([
        'release',
        'download',
        tag,
        '--repo',
        repository,
        '--dir',
        verificationRoot,
        '--pattern',
        expectedAsset,
      ])
    }

    await validateReleaseArtifacts({
      platform: 'win32',
      releaseRoot: verificationRoot,
      version,
    })
    await validateReleaseArtifacts({
      platform: 'darwin',
      releaseRoot: verificationRoot,
      version,
    })
    await compareReleaseArtifactBytes({
      actualRoot: verificationRoot,
      assets: uniqueAssets,
      expectedRoot: releaseRoot,
    })
  } catch (error) {
    await deleteExpectedAssets()
    throw new Error(
      'Cross-platform release publishing failed; partial expected assets were rolled back and the workflow can be rerun safely.',
      { cause: error }
    )
  } finally {
    await rm(verificationRoot, { force: true, recursive: true })
  }

  return uniqueAssets
}
