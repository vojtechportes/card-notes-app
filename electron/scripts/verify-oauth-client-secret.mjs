import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyOAuthClientSecret } from './verify-oauth-client-secret.util.mjs'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const secretPath = path.resolve(
  dirname,
  '../dist/auth/constants/oauth-client-secrets.js'
)

verifyOAuthClientSecret(secretPath, process.env)
console.log('Bundled Google OAuth client credential is configured.')
