import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { embedOAuthClientSecret } from './embed-oauth-client-secret.util.mjs'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const secretPath = path.resolve(
  dirname,
  '../dist/auth/constants/oauth-client-secrets.js'
)

embedOAuthClientSecret(secretPath, process.env)
