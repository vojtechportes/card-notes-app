import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const electronRoot = path.resolve(dirname, '..')
const unpackedRoot = process.env.NOTESTACK_UNPACKED_ROOT
  ? path.resolve(process.env.NOTESTACK_UNPACKED_ROOT)
  : path.join(electronRoot, 'release', 'win-unpacked')
const executablePath = path.join(unpackedRoot, 'NoteStack.exe')
const backendRoot = path.join(unpackedRoot, 'resources', 'backend')
const backendEntryPath = path.join(backendRoot, 'dist', 'main.js')
const uuidPackagePath = path.join(backendRoot, 'node_modules', 'uuid', 'package.json')
const excelUuidPackagePath = path.join(
  backendRoot,
  'node_modules',
  'exceljs',
  'node_modules',
  'uuid',
  'package.json'
)
const requiredRuntimePaths = [
  executablePath,
  backendEntryPath,
  path.join(backendRoot, 'node_modules', 'reflect-metadata', 'package.json'),
  uuidPackagePath,
  excelUuidPackagePath,
  path.join(
    backendRoot,
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node'
  ),
]

for (const requiredPath of requiredRuntimePaths) {
  if (!existsSync(requiredPath)) {
    throw new Error(`Packaged backend runtime file is missing: ${requiredPath}`)
  }
}

const uuidVersion = JSON.parse(readFileSync(uuidPackagePath, 'utf8')).version
const excelUuidVersion = JSON.parse(readFileSync(excelUuidPackagePath, 'utf8')).version

if (uuidVersion !== '11.1.0' || excelUuidVersion !== '8.3.2') {
  throw new Error(
    `Packaged UUID dependency tree is invalid: backend=${uuidVersion}, exceljs=${excelUuidVersion}.`
  )
}
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'notestack-backend-smoke-'))
const databasePath = path.join(temporaryDirectory, 'card-notes.sqlite')
const port = await getAvailablePort()
const healthUrl = `http://127.0.0.1:${port}/api/health`
const backendProcess = spawn(executablePath, [backendEntryPath], {
  cwd: unpackedRoot,
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    CARD_NOTES_DATABASE_PATH: databasePath,
    HOST: '127.0.0.1',
    PORT: String(port),
    NODE_PATH: '',
  },
  stdio: 'pipe',
})
let backendOutput = ''

backendProcess.stdout.on('data', (chunk) => {
  backendOutput = appendOutput(backendOutput, chunk.toString())
})
backendProcess.stderr.on('data', (chunk) => {
  backendOutput = appendOutput(backendOutput, chunk.toString())
})

try {
  await waitForHealth(backendProcess, healthUrl)
  console.log(`Packaged backend smoke check passed at ${healthUrl}.`)
} finally {
  if (backendProcess.exitCode === null && backendProcess.signalCode === null) {
    const backendExit = once(backendProcess, 'exit')

    backendProcess.kill()
    await backendExit
  }

  await rm(temporaryDirectory, { force: true, recursive: true })
}

async function getAvailablePort() {
  const server = createServer()

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()

  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Could not allocate a port for the packaged backend smoke check.')
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })

  return address.port
}

async function waitForHealth(childProcess, healthUrl) {
  const timeoutAt = Date.now() + 30000

  while (Date.now() < timeoutAt) {
    if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
      throw new Error(`Packaged backend exited before becoming healthy.\n${backendOutput.trim()}`)
    }

    try {
      const response = await fetch(healthUrl)

      if (response.ok) {
        return
      }
    } catch {
      // The backend is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Timed out waiting for packaged backend health.\n${backendOutput.trim()}`)
}

function appendOutput(currentOutput, nextOutput) {
  return `${currentOutput}${nextOutput}`.slice(-4000)
}
