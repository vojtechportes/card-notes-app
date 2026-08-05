import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyOAuthClientIdentities } from './verify-oauth-client-identities.util.mjs'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const identitiesPath = path.resolve(
  dirname,
  '../dist/auth/constants/oauth-client-identities.js'
)

verifyOAuthClientIdentities(identitiesPath, process.env)
console.log('Bundled OAuth client identities are configured.')
