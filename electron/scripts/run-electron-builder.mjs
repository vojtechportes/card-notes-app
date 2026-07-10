import { spawn } from 'node:child_process'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const dirname = path.dirname(fileURLToPath(import.meta.url))
const electronRoot = path.resolve(dirname, '..')
const electronBuilderPackageJsonPath = require.resolve('electron-builder/package.json')
const electronBuilderCliPath = path.join(
  path.dirname(electronBuilderPackageJsonPath),
  'cli.js'
)

process.env.CSC_IDENTITY_AUTO_DISCOVERY ??= 'false'

const childProcess = spawn(
  process.execPath,
  [electronBuilderCliPath, ...process.argv.slice(2)],
  {
    cwd: electronRoot,
    env: process.env,
    stdio: 'inherit',
  }
)

childProcess.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})

childProcess.on('error', (error) => {
  console.error(error)
  process.exit(1)
})
