import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import test from 'node:test'
import { findAvailablePort } from '../../../src/startup/utils/find-available-port.util'

test('returns and releases an available loopback port while port 3000 is occupied', async (context) => {
  const occupiedServer = createServer()

  await new Promise<void>((resolve, reject) => {
    occupiedServer.once('error', reject)
    occupiedServer.listen(3000, '127.0.0.1', resolve)
  }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EADDRINUSE') {
      throw error
    }

    context.diagnostic('Port 3000 was already occupied by another process.')
  })

  try {
    const port = await findAvailablePort('127.0.0.1')

    assert.notEqual(port, 0)
    assert.notEqual(port, 3000)

    const verificationServer = createServer()

    await new Promise<void>((resolve, reject) => {
      verificationServer.once('error', reject)
      verificationServer.listen(port, '127.0.0.1', resolve)
    })
    await new Promise<void>((resolve, reject) => {
      verificationServer.close((error) => (error ? reject(error) : resolve()))
    })
  } finally {
    if (occupiedServer.listening) {
      await new Promise<void>((resolve, reject) => {
        occupiedServer.close((error) => (error ? reject(error) : resolve()))
      })
    }
  }
})
