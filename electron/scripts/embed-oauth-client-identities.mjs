import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const identitiesPath = path.resolve(
  dirname,
  '../dist/auth/constants/oauth-client-identities.js'
)
const replacements = new Map([
  [
    '__NOTESTACK_GOOGLE_OAUTH_CLIENT_ID__',
    process.env.NOTESTACK_GOOGLE_OAUTH_CLIENT_ID,
  ],
  [
    '__NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID__',
    process.env.NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID,
  ],
])
let source = readFileSync(identitiesPath, 'utf8')

for (const [placeholder, clientId] of replacements) {
  if (!clientId) {
    continue
  }

  source = source.replace(placeholder, clientId.replaceAll("'", "\\'"))
}

writeFileSync(identitiesPath, source)
