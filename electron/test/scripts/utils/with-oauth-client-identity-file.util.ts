import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const placeholderSource = `export const BUNDLED_GOOGLE_OAUTH_CLIENT_ID =
  '__NOTESTACK_GOOGLE_OAUTH_CLIENT_ID__'
export const BUNDLED_MICROSOFT_OAUTH_CLIENT_ID =
  '__NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID__'
`

export const withOAuthClientIdentityFile = (
  run: (identitiesPath: string) => void
): void => {
  const directory = mkdtempSync(
    path.join(tmpdir(), 'notestack-oauth-identities-')
  )
  const identitiesPath = path.join(directory, 'oauth-client-identities.js')

  try {
    writeFileSync(identitiesPath, placeholderSource)
    run(identitiesPath)
  } finally {
    rmSync(directory, { force: true, recursive: true })
  }
}
