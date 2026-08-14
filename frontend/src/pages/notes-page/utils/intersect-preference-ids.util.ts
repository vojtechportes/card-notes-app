export const intersectPreferenceIds = (
  selectedIds: string[],
  availableIds: ReadonlySet<string>
): string[] => {
  return selectedIds.filter((id) => availableIds.has(id))
}
