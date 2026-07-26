import {
  fitEvidenceImage,
  shouldOptimizeEvidenceFile,
} from "@/lib/attendance-correction-upload.mjs";

function decodeImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Format foto tidak dapat diproses oleh browser."));
    };
    image.src = objectUrl;
  });
}

async function optimizeEvidenceImage(file: File): Promise<File> {
  if (!shouldOptimizeEvidenceFile(file.type, file.size)) return file;

  const image = await decodeImage(file);
  const size = fitEvidenceImage(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak dapat menyiapkan foto untuk upload.");
  context.drawImage(image, 0, 0, size.width, size.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82)
  );
  if (!blob) throw new Error("Foto gagal dikompresi.");
  if (blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "bukti";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

export async function prepareEvidenceFiles(files: File[]) {
  const preparedFiles = await Promise.all(files.map(optimizeEvidenceImage));
  return {
    files: preparedFiles,
    wasOptimized: preparedFiles.some((file, index) => file.size < files[index].size),
  };
}

export function replaceInputFiles(input: HTMLInputElement, files: File[]) {
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
}

export function totalFileBytes(files: File[]) {
  return files.reduce((sum, file) => sum + file.size, 0);
}
