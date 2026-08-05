export const createPackagedOAuthVerificationEnvironment = (environment) => {
  return Object.fromEntries(
    Object.entries(environment).filter(([name]) => {
      const normalizedName = name.toUpperCase()

      return (
        normalizedName !== 'NOTESTACK_GOOGLE_OAUTH_CLIENT_ID' &&
        normalizedName !== 'NOTESTACK_GOOGLE_OAUTH_CLIENT_SECRET' &&
        normalizedName !== 'NOTESTACK_MICROSOFT_OAUTH_CLIENT_ID'
      )
    })
  )
}
