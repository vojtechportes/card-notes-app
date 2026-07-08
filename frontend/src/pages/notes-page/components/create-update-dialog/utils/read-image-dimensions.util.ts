export const readImageDimensions = async (
  source: string,
): Promise<{ height: number; width: number }> => {
  return await new Promise<{ height: number; width: number }>((resolve, reject) => {
    const image = new Image();

    image.onerror = () => reject(new Error('Failed to read image dimensions.'));
    image.onload = () => {
      resolve({
        height: image.naturalHeight,
        width: image.naturalWidth,
      });
    };
    image.src = source;
  });
};
