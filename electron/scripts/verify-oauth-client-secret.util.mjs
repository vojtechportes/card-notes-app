import { readFileSync } from 'node:fs'
import { oauthClientSecretDefinition } from './oauth-client-secret-definition.mjs'

export const verifyOAuthClientSecret = (secretPath, environment) => {
  const configuredSecret =
    environment[oauthClientSecretDefinition.environmentName]?.trim()

  if (!configuredSecret) {
    throw new Error(
      `${oauthClientSecretDefinition.environmentName} is missing from the build environment.`
    )
  }

  if (
    configuredSecret === oauthClientSecretDefinition.placeholder ||
    !oauthClientSecretDefinition.pattern.test(configuredSecret)
  ) {
    throw new Error(
      `${oauthClientSecretDefinition.environmentName} is not a valid OAuth client secret.`
    )
  }

  const source = readFileSync(secretPath, 'utf8')

  if (source.includes(oauthClientSecretDefinition.placeholder)) {
    throw new Error(
      `${oauthClientSecretDefinition.environmentName} is missing from the build.`
    )
  }

  const assignmentPattern = new RegExp(
    `export const ${oauthClientSecretDefinition.constantName} =\\s*['"]([^'"]*)['"]`
  )
  const embeddedSecret = source.match(assignmentPattern)?.[1]?.trim()

  if (
    !embeddedSecret ||
    !oauthClientSecretDefinition.pattern.test(embeddedSecret)
  ) {
    throw new Error(
      `${oauthClientSecretDefinition.environmentName} is not a valid OAuth client secret.`
    )
  }

  if (embeddedSecret !== configuredSecret) {
    throw new Error(
      `${oauthClientSecretDefinition.environmentName} does not match the embedded build.`
    )
  }
}
