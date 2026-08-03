export const createGoogleDriveFileName = (logicalKey: string): string =>
  `notestack-${Buffer.from(logicalKey, 'utf8').toString('base64url')}`
