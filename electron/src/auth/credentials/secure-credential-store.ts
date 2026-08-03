import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import type { CredentialStore } from '../types/credential-store.js'
import type { OAuthProviderEnum } from '../types/oauth-provider-enum.js'
import type { SafeStorageLike } from '../types/safe-storage-like.js'
import type { StoredOAuthCredential } from '../types/stored-oauth-credential.js'

export class SecureCredentialStore implements CredentialStore {
  private readonly credentialFilePath: string

  constructor(
    dataRoot: string,
    private readonly safeStorage: SafeStorageLike,
    credentialFileName = 'oauth-credentials.enc'
  ) {
    this.credentialFilePath = path.join(dataRoot, credentialFileName)
  }

  delete(provider: OAuthProviderEnum): void {
    const credentials = this.loadAll()

    if (!credentials[provider]) {
      return
    }

    delete credentials[provider]

    if (Object.keys(credentials).length === 0) {
      rmSync(this.credentialFilePath, { force: true })
      return
    }

    this.saveAll(credentials)
  }

  load(provider: OAuthProviderEnum): StoredOAuthCredential | null {
    return this.loadAll()[provider] ?? null
  }

  save(provider: OAuthProviderEnum, credential: StoredOAuthCredential): void {
    const credentials = this.loadAll()
    credentials[provider] = credential
    this.saveAll(credentials)
  }

  private assertSecureStorage(): void {
    const selectedBackend = this.safeStorage.getSelectedStorageBackend?.()

    if (
      !this.safeStorage.isEncryptionAvailable() ||
      selectedBackend === 'basic_text'
    ) {
      throw new Error('oauth-secure-storage-unavailable')
    }
  }

  private loadAll(): Partial<Record<OAuthProviderEnum, StoredOAuthCredential>> {
    if (!existsSync(this.credentialFilePath)) {
      return {}
    }

    this.assertSecureStorage()

    try {
      const encrypted = Buffer.from(
        readFileSync(this.credentialFilePath, 'utf8'),
        'base64'
      )
      const decrypted = this.safeStorage.decryptString(encrypted)

      return JSON.parse(decrypted) as Partial<
        Record<OAuthProviderEnum, StoredOAuthCredential>
      >
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'oauth-secure-storage-unavailable'
      ) {
        throw error
      }

      throw new Error('oauth-reconnect-required')
    }
  }

  private saveAll(
    credentials: Partial<Record<OAuthProviderEnum, StoredOAuthCredential>>
  ): void {
    this.assertSecureStorage()
    mkdirSync(path.dirname(this.credentialFilePath), { recursive: true })

    const encrypted = this.safeStorage.encryptString(
      JSON.stringify(credentials)
    )
    const temporaryPath = `${this.credentialFilePath}.tmp`

    writeFileSync(temporaryPath, encrypted.toString('base64'), { mode: 0o600 })
    renameSync(temporaryPath, this.credentialFilePath)
  }
}
