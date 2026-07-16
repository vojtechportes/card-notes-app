import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { openBackendLog } from '../../../src/startup/utils/open-backend-log.util'

test('returns missing without revealing a path when the backend log does not exist', async () => {
  let revealedPath: string | null = null

  const result = await openBackendLog('missing-backend.log', (logPath) => {
    revealedPath = logPath
  })

  assert.equal(result, 'missing')
  assert.equal(revealedPath, null)
})

test('reveals the fixed backend log path when it exists', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'notestack-log-'))
  const logPath = path.join(directory, 'backend.log')
  let revealedPath: string | null = null

  try {
    writeFileSync(logPath, 'startup log')

    const result = await openBackendLog(logPath, (selectedPath) => {
      revealedPath = selectedPath
    })

    assert.equal(result, 'opened')
    assert.equal(revealedPath, logPath)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('reports reveal failures without throwing', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'notestack-log-'))
  const logPath = path.join(directory, 'backend.log')

  try {
    writeFileSync(logPath, 'startup log')

    const result = await openBackendLog(logPath, () => {
      throw new Error('Shell unavailable')
    })

    assert.equal(result, 'failed')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
