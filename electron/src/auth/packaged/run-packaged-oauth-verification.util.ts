import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import type { App, SafeStorage } from 'electron'
import { OAuthProviderEnum } from '../types/oauth-provider-enum.js'
import { assertBundledOAuthClientIdentities } from './assert-bundled-oauth-client-identities.util.js'
import { verifyPackagedOAuthProvider } from './verify-packaged-oauth-provider.util.js'

export const runPackagedOAuthVerification = async (
  app: App,
  safeStorage: SafeStorage
): Promise<void> => {
  assertBundledOAuthClientIdentities()

  const dataRoot = await mkdtemp(
    path.join(app.getPath('temp'), 'notestack-packaged-oauth-')
  )

  try {
    for (const provider of Object.values(OAuthProviderEnum)) {
      await verifyPackagedOAuthProvider(provider, dataRoot, safeStorage)
    }
  } finally {
    await rm(dataRoot, { force: true, recursive: true })
  }
}
