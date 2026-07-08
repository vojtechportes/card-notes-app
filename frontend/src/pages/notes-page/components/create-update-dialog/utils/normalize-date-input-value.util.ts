export const normalizeDateInputValue = (value: string): string => {
  const leadingDateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);

  if (leadingDateMatch) {
    return leadingDateMatch[0];
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  const parsedDate = new Date(timestamp);
  const year = String(parsedDate.getFullYear());
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
