import { execFile } from 'node:child_process'
import path from 'node:path'
import { publishReleaseAssets } from './publish-release-assets.util.mjs'

const [tag, repository, releaseRootArgument] = process.argv.slice(2)

if (!tag || !repository || !releaseRootArgument) {
  throw new Error(
    'Usage: publish-release-assets <tag> <owner/repo> <release-root>'
  )
}

if (!process.env.GH_TOKEN) {
  throw new Error('GH_TOKEN is required to publish release assets.')
}

const runGh = (argumentsList) =>
  new Promise((resolve, reject) => {
    execFile(
      'gh',
      argumentsList,
      { env: process.env },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${error.message}\n${stderr.trim()}`))
          return
        }

        resolve(stdout)
      }
    )
  })
const assets = await publishReleaseAssets({
  releaseRoot: path.resolve(releaseRootArgument),
  repository,
  runGh,
  tag,
})

console.log(`Published and verified ${assets.length} exact assets for ${tag}.`)
