import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { SecureCredentialStore } from '../../src/auth/credentials/secure-credential-store'
import { OAuthProviderEnum } from '../../src/auth/types/oauth-provider-enum'
import type { SafeStorageLike } from '../../src/auth/types/safe-storage-like'

const createSafeStorage = (available = true): SafeStorageLike => ({
  decryptString: (encrypted) =>
    Buffer.from(encrypted).reverse().toString('utf8'),
  encryptString: (plainText) => Buffer.from(plainText).reverse(),
  getSelectedStorageBackend: () => (available ? 'dpapi' : 'basic_text'),
  isEncryptionAvailable: () => available,
})

test('credentials are encrypted on disk and survive a store restart', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'notestack-oauth-store-'))

  try {
    const store = new SecureCredentialStore(dataRoot, createSafeStorage())
    const credential = {
      account: {
        accountId: 'account-1',
        displayName: 'Person',
        provider: OAuthProviderEnum.GoogleDrive,
        tenantId: null,
      },
      refreshToken: 'refresh-secret',
    }

    assert.equal(
      existsSync(path.join(dataRoot, 'oauth-credentials.enc')),
      false
    )
    store.save(OAuthProviderEnum.GoogleDrive, credential)

    const serialized = readFileSync(
      path.join(dataRoot, 'oauth-credentials.enc'),
      'utf8'
    )
    assert.doesNotMatch(serialized, /refresh-secret|account-1/)

    const restartedStore = new SecureCredentialStore(
      dataRoot,
      createSafeStorage()
    )
    assert.deepEqual(
      restartedStore.load(OAuthProviderEnum.GoogleDrive),
      credential
    )

    restartedStore.delete(OAuthProviderEnum.GoogleDrive)
    assert.equal(
      existsSync(path.join(dataRoot, 'oauth-credentials.enc')),
      false
    )
  } finally {
    await rm(dataRoot, { force: true, recursive: true })
  }
})

test('credential persistence refuses unavailable or basic-text storage', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'notestack-oauth-store-'))
  const store = new SecureCredentialStore(dataRoot, createSafeStorage(false))

  try {
    assert.throws(
      () =>
        store.save(OAuthProviderEnum.OneDrive, {
          account: {
            accountId: 'account-1',
            displayName: null,
            provider: OAuthProviderEnum.OneDrive,
            tenantId: 'tenant-1',
          },
          refreshToken: 'refresh-secret',
        }),
      /oauth-secure-storage-unavailable/
    )
    assert.equal(
      existsSync(path.join(dataRoot, 'oauth-credentials.enc')),
      false
    )
  } finally {
    await rm(dataRoot, { force: true, recursive: true })
  }
})
