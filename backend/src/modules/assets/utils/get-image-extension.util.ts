const extensionsByMimeType: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const getImageExtension = (mimeType: string): string | null =>
  extensionsByMimeType[mimeType] ?? null
