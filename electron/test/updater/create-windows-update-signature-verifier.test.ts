import assert from 'node:assert/strict'
import test from 'node:test'
import { createWindowsUpdateSignatureVerifier } from '../../src/updater/create-windows-update-signature-verifier'

interface SignatureFixture {
  path: string | null
  signerSubject: string | null
  signerThumbprint: string | null
  status: number | null
  statusMessage: string | null
}

const createSignatureReader = (signatures: Record<string, SignatureFixture>) => {
  return async (filePath: string): Promise<SignatureFixture> => {
    const signature = signatures[filePath]

    if (!signature) {
      throw new Error(`Missing signature fixture for ${filePath}`)
    }

    return signature
  }
}

test('keeps the upstream verifier result when the update is already trusted', async () => {
  const verifySignature = createWindowsUpdateSignatureVerifier({
    currentFilePath: 'current.exe',
    verifySignature: async () => null,
  })

  const result = await verifySignature(['NoteStack'], 'update.exe')

  assert.equal(result, null)
})

test('accepts a self-signed update when it uses the same certificate as the running app', async () => {
  const warnings: string[] = []
  const verifySignature = createWindowsUpdateSignatureVerifier({
    currentFilePath: 'current.exe',
    logger: {
      warn: (message) => {
        warnings.push(message)
      },
    },
    readSignatureInfo: createSignatureReader({
      'current.exe': {
        path: 'current.exe',
        signerSubject: 'CN=NoteStack',
        signerThumbprint: '596C1F5860A068AE8F87539A5FD4FF593B49C091',
        status: 1,
        statusMessage: 'A certificate chain processed, but terminated in a root certificate which is not trusted by the trust provider',
      },
      'update.exe': {
        path: 'update.exe',
        signerSubject: 'CN=NoteStack',
        signerThumbprint: '596c1f5860a068ae8f87539a5fd4ff593b49c091',
        status: 1,
        statusMessage: 'A certificate chain processed, but terminated in a root certificate which is not trusted by the trust provider',
      },
    }),
    verifySignature: async () => 'publisherNames: NoteStack, raw info: invalid signature',
  })

  const result = await verifySignature(['NoteStack'], 'update.exe')

  assert.equal(result, null)
  assert.equal(warnings.length, 1)
})

test('returns the upstream verifier error when the certificate thumbprint changes', async () => {
  const upstreamError = 'publisherNames: NoteStack, raw info: invalid signature'
  const verifySignature = createWindowsUpdateSignatureVerifier({
    currentFilePath: 'current.exe',
    readSignatureInfo: createSignatureReader({
      'current.exe': {
        path: 'current.exe',
        signerSubject: 'CN=NoteStack',
        signerThumbprint: 'AAA111',
        status: 1,
        statusMessage: 'Self-signed root is not trusted.',
      },
      'update.exe': {
        path: 'update.exe',
        signerSubject: 'CN=NoteStack',
        signerThumbprint: 'BBB222',
        status: 1,
        statusMessage: 'Self-signed root is not trusted.',
      },
    }),
    verifySignature: async () => upstreamError,
  })

  const result = await verifySignature(['NoteStack'], 'update.exe')

  assert.equal(result, upstreamError)
})

test('does not bypass a publisher mismatch when the upstream verifier already trusts the update chain', async () => {
  const upstreamError = 'publisherNames: NoteStack, raw info: incorrect publisher'
  const verifySignature = createWindowsUpdateSignatureVerifier({
    currentFilePath: 'current.exe',
    readSignatureInfo: createSignatureReader({
      'current.exe': {
        path: 'current.exe',
        signerSubject: 'CN=NoteStack',
        signerThumbprint: 'AAA111',
        status: 1,
        statusMessage: 'Self-signed root is not trusted.',
      },
      'update.exe': {
        path: 'update.exe',
        signerSubject: 'CN=Another Publisher',
        signerThumbprint: 'AAA111',
        status: 0,
        statusMessage: 'Valid',
      },
    }),
    verifySignature: async () => upstreamError,
  })

  const result = await verifySignature(['NoteStack'], 'update.exe')

  assert.equal(result, upstreamError)
})
