const MAX_RUNTIME_ROUTE_LENGTH = 180
const safeRuntimeRoutePattern = /^\/[a-z0-9_./:-]*$/i

export const getSanitizedRuntimeRouteValue = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_RUNTIME_ROUTE_LENGTH ||
    !safeRuntimeRoutePattern.test(value)
  ) {
    return 'unavailable'
  }

  return value
}
