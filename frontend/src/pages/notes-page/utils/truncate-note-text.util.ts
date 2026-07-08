export const truncateNoteText = (
  value: string,
  maxLength: number | null,
): string => {
  if (maxLength === null || value.length <= maxLength) {
    return value;
  }

  if (maxLength < 4) {
    return value.slice(0, maxLength);
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
};
