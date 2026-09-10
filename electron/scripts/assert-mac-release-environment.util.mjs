export const assertMacReleaseEnvironment = (environment) => {
  const requiredNames = [
    'CSC_LINK',
    'CSC_KEY_PASSWORD',
    'APPLE_API_KEY',
    'APPLE_API_KEY_ID',
    'APPLE_API_ISSUER',
  ]
  const missingNames = requiredNames.filter(
    (name) => !environment[name]?.trim()
  )

  if (missingNames.length > 0) {
    throw new Error(
      `Missing macOS release configuration: ${missingNames.join(', ')}.`
    )
  }
}
