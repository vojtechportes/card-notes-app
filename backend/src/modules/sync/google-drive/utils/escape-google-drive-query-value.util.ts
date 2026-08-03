export const escapeGoogleDriveQueryValue = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")
