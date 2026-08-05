import { readFileSync, writeFileSync } from 'node:fs'
import { oauthClientSecretDefinition } from './oauth-client-secret-definition.mjs'

export const embedOAuthClientSecret = (secretPath, environment) => {
  const configuredSecret =
    environment[oauthClientSecretDefinition.environmentName]?.trim()
  let secret = oauthClientSecretDefinition.placeholder

  if (configuredSecret) {
    if (
      configuredSecret === oauthClientSecretDefinition.placeholder ||
      !oauthClientSecretDefinition.pattern.test(configuredSecret)
    ) {
      throw new Error(
        `${oauthClientSecretDefinition.environmentName} is not a valid OAuth client secret.`
      )
    }

    secret = configuredSecret
  }

  let source = readFileSync(secretPath, 'utf8')
  const assignmentPattern = new RegExp(
    `(export const ${oauthClientSecretDefinition.constantName} =\\s*['"])[^'"]*(['"])`
  )

  if (!assignmentPattern.test(source)) {
    throw new Error(
      `${oauthClientSecretDefinition.environmentName} build constant could not be found.`
    )
  }

  source = source.replace(assignmentPattern, `$1${secret}$2`)
  writeFileSync(secretPath, source)
}
