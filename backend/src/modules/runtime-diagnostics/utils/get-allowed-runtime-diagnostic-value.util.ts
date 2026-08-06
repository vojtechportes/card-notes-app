export const getAllowedRuntimeDiagnosticValue = (
  value: unknown,
  allowedValues: readonly string[],
  fallback = 'unknown'
): string => {
  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    return fallback
  }

  return value
}
