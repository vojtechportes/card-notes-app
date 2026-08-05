import { readFileSync, writeFileSync } from 'node:fs'
import { oauthClientIdentityDefinitions } from './oauth-client-identity-definitions.mjs'

export const embedOAuthClientIdentities = (identitiesPath, environment) => {
  let source = readFileSync(identitiesPath, 'utf8')

  for (const definition of oauthClientIdentityDefinitions) {
    const clientId = environment[definition.environmentName]?.trim()
    let identity = definition.placeholder

    if (clientId) {
      if (!definition.pattern.test(clientId)) {
        throw new Error(
          `${definition.environmentName} is not a valid OAuth client ID.`
        )
      }

      identity = clientId
    }

    const assignmentPattern = new RegExp(
      `(export const ${definition.constantName} =\\s*['\"])[^'\"]*(['\"])`
    )

    if (!assignmentPattern.test(source)) {
      throw new Error(
        `${definition.environmentName} build constant could not be found.`
      )
    }

    const escapedIdentity = identity
      .replaceAll('\\', '\\\\')
      .replaceAll("'", "\\'")

    source = source.replace(assignmentPattern, `$1${escapedIdentity}$2`)
  }

  writeFileSync(identitiesPath, source)
}
