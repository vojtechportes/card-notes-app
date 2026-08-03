export const getResumableUploadOffset = (range: string | null): number => {
  if (!range) {
    return 0
  }

  const match = /^bytes=0-(\d+)$/.exec(range)
  if (!match) {
    return 0
  }

  return Number(match[1]) + 1
}
