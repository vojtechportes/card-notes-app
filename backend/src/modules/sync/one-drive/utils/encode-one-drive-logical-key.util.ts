export const encodeOneDriveLogicalKey = (logicalKey: string): string =>
  `${Buffer.from(logicalKey, 'utf8').toString('base64url')}.notestack`
