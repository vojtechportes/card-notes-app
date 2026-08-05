import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { embedOAuthClientIdentities } from './embed-oauth-client-identities.util.mjs'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const identitiesPath = path.resolve(
  dirname,
  '../dist/auth/constants/oauth-client-identities.js'
)

embedOAuthClientIdentities(identitiesPath, process.env)
