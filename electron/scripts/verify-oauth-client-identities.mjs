import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const identitiesPath = path.resolve(
  dirname,
  '../dist/auth/constants/oauth-client-identities.js'
)
const source = readFileSync(identitiesPath, 'utf8')

if (source.includes('__NOTESTACK_GOOGLE_OAUTH_CLIENT_ID__')) {
  throw new Error('The release build is missing the Google OAuth client ID.')
}

if (source.includes('__NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID__')) {
  throw new Error('The release build is missing the Microsoft OAuth client ID.')
}

console.log('Bundled OAuth client identities are configured.')
