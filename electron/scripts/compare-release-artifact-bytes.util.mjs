import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

export const compareReleaseArtifactBytes = async ({
  actualRoot,
  assets,
  expectedRoot,
}) => {
  for (const asset of assets) {
    const expectedPath = path.join(expectedRoot, asset)
    const actualPath = path.join(actualRoot, asset)
    const [expectedBytes, actualBytes, expectedStats, actualStats] =
      await Promise.all([
        readFile(expectedPath),
        readFile(actualPath),
        stat(expectedPath),
        stat(actualPath),
      ])
    const expectedHash = createHash('sha512')
      .update(expectedBytes)
      .digest('base64')
    const actualHash = createHash('sha512').update(actualBytes).digest('base64')

    if (
      expectedStats.size !== actualStats.size ||
      expectedHash !== actualHash
    ) {
      throw new Error(
        `Published release asset bytes do not match the staged ${asset}.`
      )
    }
  }
}
