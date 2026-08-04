import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const executablePath = path.resolve(
  dirname,
  '../release/win-unpacked/NoteStack.exe'
)

if (!existsSync(executablePath)) {
  throw new Error('The packaged NoteStack executable was not found.')
}

const verificationRoots = await Promise.all(
  ['device-a', 'device-b'].map((deviceName) =>
    mkdtemp(
      path.join(
        tmpdir(),
        `notestack-packaged-oauth-verification-${deviceName}-`
      )
    )
  )
)

try {
  await Promise.all(
    verificationRoots.map(async (verificationRoot, index) => {
      const resultPath = path.join(verificationRoot, 'result')
      const childProcess = spawn(executablePath, [], {
        env: {
          ...process.env,
          NOTESTACK_PACKAGED_INSTANCE_ID: `device-${index + 1}`,
          NOTESTACK_PACKAGED_OAUTH_VERIFICATION_ROOT: verificationRoot,
          NOTESTACK_VERIFY_PACKAGED_OAUTH: '1',
        },
        stdio: 'pipe',
      })
      let output = ''
      const timeout = setTimeout(() => {
        childProcess.kill()
      }, 45_000)

      childProcess.stdout.on('data', (chunk) => {
        output = `${output}${chunk.toString()}`.slice(-4000)
      })
      childProcess.stderr.on('data', (chunk) => {
        output = `${output}${chunk.toString()}`.slice(-4000)
      })

      const exitCode = await new Promise((resolve, reject) => {
        childProcess.once('error', reject)
        childProcess.once('exit', resolve)
      })
      clearTimeout(timeout)

      let result = ''

      try {
        result = await readFile(resultPath, 'utf8')
      } catch {
        // The explicit result marker is required to prevent false-positive exits.
      }

      if (exitCode !== 0 || result !== 'passed') {
        throw new Error(
          `Packaged OAuth verification failed for device ${index + 1} with exit code ${exitCode}.\n${output.trim()}`
        )
      }
    })
  )

  console.log(
    'Packaged OAuth verification passed concurrently on two isolated instances for Google Drive and OneDrive.'
  )
} finally {
  await Promise.all(
    verificationRoots.map((verificationRoot) =>
      rm(verificationRoot, { force: true, recursive: true })
    )
  )
}
