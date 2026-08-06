import { getSanitizedRuntimeRouteValue } from './get-sanitized-runtime-route-value.util'

interface RuntimeHttpRequest {
  baseUrl?: unknown
  route?: {
    path?: unknown
  }
}

export const getSanitizedRouteTemplate = (
  request: RuntimeHttpRequest
): string => {
  if (
    typeof request.baseUrl !== 'string' ||
    typeof request.route?.path !== 'string'
  ) {
    return 'unavailable'
  }

  return getSanitizedRuntimeRouteValue(request.baseUrl + request.route.path)
}
