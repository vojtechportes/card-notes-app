export const parseJsonFile = async (file: File): Promise<unknown> => {
  return JSON.parse(await file.text()) as unknown;
};
