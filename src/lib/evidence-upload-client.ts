import {
  EVIDENCE_MAX_FILE_BYTES,
  evidenceCompressionAttempts,
  fitEvidenceImage,
  isEvidenceFileWithinLimit,
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
      reject(
        new Error(
          "Format foto tidak dapat diproses oleh browser. Pilih atau konversi foto ke JPG, PNG, atau WebP."
        )
      );
    };
    image.src = objectUrl;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
}

async function optimizeEvidenceImage(
  file: File,
  maxFileBytes?: number,
  convertToJpeg = false
): Promise<File> {
  const shouldPrepare =
    convertToJpeg || shouldOptimizeEvidenceFile(file.type, file.size);
  if (!shouldPrepare) return file;

  const image = await decodeImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak dapat menyiapkan foto untuk upload.");

  const attempts = maxFileBytes
    ? evidenceCompressionAttempts(image.naturalWidth, image.naturalHeight)
    : [
        {
          ...fitEvidenceImage(image.naturalWidth, image.naturalHeight),
          quality: 0.82,
        },
      ];

  for (const attempt of attempts) {
    canvas.width = attempt.width;
    canvas.height = attempt.height;
    context.drawImage(image, 0, 0, attempt.width, attempt.height);

    const blob = await canvasToJpeg(canvas, attempt.quality);
    if (!blob) throw new Error("Foto gagal dikompresi.");

    const isSmaller = blob.size < file.size;
    const isWithinLimit =
      !maxFileBytes || isEvidenceFileWithinLimit(blob.size, maxFileBytes);
    if ((convertToJpeg || isSmaller) && isWithinLimit) {
      const baseName = file.name.replace(/\.[^.]+$/, "") || "bukti";
      return new File([blob], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    }
  }

  if (maxFileBytes && (convertToJpeg || file.size > maxFileBytes)) {
    throw new Error(
      `Foto ${file.name} tidak dapat diperkecil hingga di bawah 5 MB.`
    );
  }
  return file;
}

export async function prepareEvidenceFiles(
  files: File[],
  options: { maxFileBytes?: number; convertToJpeg?: boolean } = {
    maxFileBytes: EVIDENCE_MAX_FILE_BYTES,
  }
) {
  const maxFileBytes = options.maxFileBytes;
  const convertToJpeg = options.convertToJpeg ?? false;
  const preparedFiles: File[] = [];
  for (const file of files) {
    preparedFiles.push(
      await optimizeEvidenceImage(file, maxFileBytes, convertToJpeg)
    );
  }

  const oversizedFile = maxFileBytes
    ? preparedFiles.find(
        (file) => !isEvidenceFileWithinLimit(file.size, maxFileBytes)
      )
    : undefined;
  if (oversizedFile) {
    const isPdf = oversizedFile.type === "application/pdf";
    throw new Error(
      isPdf
        ? `PDF ${oversizedFile.name} melebihi 5 MB. Pilih PDF yang lebih kecil.`
        : `File ${oversizedFile.name} melebihi batas 5 MB.`
    );
  }

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
