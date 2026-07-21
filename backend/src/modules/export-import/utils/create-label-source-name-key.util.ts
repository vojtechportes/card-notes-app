export const createLabelSourceNameKey = (
  noteTypeId: string | null,
  name: string
): string => {
  return JSON.stringify([noteTypeId, name])
}
