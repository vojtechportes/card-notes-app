import path from 'node:path'

const PACKAGED_OAUTH_VERIFICATION_DIRECTORY_PREFIX =
  'notestack-packaged-oauth-verification-'

export const getPackagedOAuthVerificationRoot = (
  temporaryDirectory: string,
  candidate: string | undefined
): string | null => {
  if (!candidate) {
    return null
  }

  const resolvedTemporaryDirectory = path.resolve(temporaryDirectory)
  const resolvedCandidate = path.resolve(candidate)

  if (
    path.dirname(resolvedCandidate) !== resolvedTemporaryDirectory ||
    !path
      .basename(resolvedCandidate)
      .startsWith(PACKAGED_OAUTH_VERIFICATION_DIRECTORY_PREFIX)
  ) {
    return null
  }

  return resolvedCandidate
}
