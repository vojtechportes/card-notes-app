export const parseDeveloperToolsEnabled = (value: unknown): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error('developer-tools-invalid-preference')
  }

  return value
}
