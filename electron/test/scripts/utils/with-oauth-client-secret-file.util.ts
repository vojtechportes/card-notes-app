import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const placeholderSource = `export const BUNDLED_GOOGLE_OAUTH_CLIENT_SECRET =
  '__NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET__'
`

export const withOAuthClientSecretFile = (
  run: (secretPath: string) => void
): void => {
  const directory = mkdtempSync(
    path.join(tmpdir(), 'notestack-oauth-client-secret-')
  )
  const secretPath = path.join(directory, 'oauth-client-secrets.js')

  try {
    writeFileSync(secretPath, placeholderSource)
    run(secretPath)
  } finally {
    rmSync(directory, { force: true, recursive: true })
  }
}
