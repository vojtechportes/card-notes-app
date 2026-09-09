import assert from 'node:assert/strict'
import { MacUpdater } from 'electron-updater'
import test from 'node:test'

interface UpdateFile {
  info: { url: string }
  url: URL
}

const files: UpdateFile[] = ['x64', 'arm64'].map((architecture) => ({
  info: { url: `notestack-1.2.3-${architecture}.zip` },
  url: new URL(`https://github.test/notestack-1.2.3-${architecture}.zip`),
}))
const filterFilesForArch = (
  MacUpdater as unknown as {
    filterFilesForArch: (
      updateFiles: UpdateFile[],
      isArm64Mac: boolean
    ) => UpdateFile[]
  }
).filterFilesForArch

test('pinned MacUpdater selects the matching architecture from the merged manifest', () => {
  assert.deepEqual(
    filterFilesForArch(files, false).map((file) => file.info.url),
    ['notestack-1.2.3-x64.zip']
  )
  assert.deepEqual(
    filterFilesForArch(files, true).map((file) => file.info.url),
    ['notestack-1.2.3-arm64.zip']
  )
})
