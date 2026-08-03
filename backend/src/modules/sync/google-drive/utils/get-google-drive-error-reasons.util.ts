import type { GoogleDriveErrorResponse } from '../types/google-drive-error-response'

export const getGoogleDriveErrorReasons = async (
  response: Response
): Promise<string[]> => {
  try {
    const value = (await response.clone().json()) as GoogleDriveErrorResponse

    return (
      value.error?.errors
        ?.map((error) => error.reason)
        .filter((reason): reason is string => Boolean(reason)) ?? []
    )
  } catch {
    return []
  }
}
