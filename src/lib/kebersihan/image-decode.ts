const MAX_EDGE = 2400;

/**
 * Decodes a participant's photo and caps its long edge, so a 12MP camera file
 * does not exhaust memory on a mid-range phone during rasterization.
 */
export async function decodePhoto(file: File) {
  const objectUrl = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image = await loadImage(objectUrl);
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error(
      "Format foto ini tidak didukung browser. Pilih foto JPG/PNG, atau ubah setelan Kamera iPhone ke 'Paling Kompatibel'."
    );
  }

  const longEdge = Math.max(image.naturalWidth, image.naturalHeight);
  if (longEdge <= MAX_EDGE) {
    return { src: objectUrl, imgW: image.naturalWidth, imgH: image.naturalHeight };
  }

  const scale = MAX_EDGE / longEdge;
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Browser tidak dapat menyiapkan foto.");
  }
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9)
  );
  URL.revokeObjectURL(objectUrl);
  if (!blob) throw new Error("Foto gagal diperkecil.");

  return { src: URL.createObjectURL(blob), imgW: width, imgH: height };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode failed"));
    image.src = src;
  });
}
