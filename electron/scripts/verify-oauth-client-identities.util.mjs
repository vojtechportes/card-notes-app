import { readFileSync } from 'node:fs'
import { oauthClientIdentityDefinitions } from './oauth-client-identity-definitions.mjs'

export const verifyOAuthClientIdentities = (identitiesPath, environment) => {
  const source = readFileSync(identitiesPath, 'utf8')

  for (const definition of oauthClientIdentityDefinitions) {
    const configuredClientId = environment[definition.environmentName]?.trim()

    if (!configuredClientId) {
      throw new Error(
        `${definition.environmentName} is missing from the build environment.`
      )
    }

    if (!definition.pattern.test(configuredClientId)) {
      throw new Error(
        `${definition.environmentName} is not a valid OAuth client ID.`
      )
    }

    if (source.includes(definition.placeholder)) {
      throw new Error(
        `${definition.environmentName} is missing from the build.`
      )
    }

    const assignmentPattern = new RegExp(
      `export const ${definition.constantName} =\\s*['\"]([^'\"]*)['\"]`
    )
    const embeddedClientId = source.match(assignmentPattern)?.[1]?.trim()

    if (!embeddedClientId || !definition.pattern.test(embeddedClientId)) {
      throw new Error(
        `${definition.environmentName} is not a valid OAuth client ID.`
      )
    }

    if (embeddedClientId !== configuredClientId) {
      throw new Error(
        `${definition.environmentName} does not match the embedded build.`
      )
    }
  }
}
