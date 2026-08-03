export interface SafeStorageLike {
  decryptString: (encrypted: Buffer) => string
  encryptString: (plainText: string) => Buffer
  getSelectedStorageBackend?: () => string
  isEncryptionAvailable: () => boolean
}
