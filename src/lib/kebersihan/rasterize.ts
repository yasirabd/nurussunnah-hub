import { domToBlob } from "modern-screenshot";

const WIDTH = 1080;
const HEIGHT = 1350;

const BRAND_ASSETS = ["/kebersihan/logo.png", "/kebersihan/hut81.webp"];

let assetsDecoded: Promise<void> | null = null;

/**
 * A slide exported without the logo looks official but is not, so rasterizing
 * is blocked until both brand marks have actually decoded.
 */
function ensureBrandAssetsDecoded() {
  if (!assetsDecoded) {
    assetsDecoded = Promise.all(
      BRAND_ASSETS.map((src) => {
        const image = new Image();
        image.src = src;
        return image.decode();
      })
    )
      .then(() => undefined)
      .catch(() => {
        assetsDecoded = null;
        throw new Error(
          "Logo atau lambang HUT RI gagal dimuat. Periksa koneksi lalu coba lagi."
        );
      });
  }
  return assetsDecoded;
}

const RENDER_OPTIONS = {
  width: WIDTH,
  height: HEIGHT,
  scale: 1,
  type: "image/jpeg",
  quality: 0.92,
} as const;

export async function rasterizeSlide(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  await ensureBrandAssetsDecoded();

  // Safari frequently drops fonts or images on the first pass, so the first
  // result is treated as a warm-up and discarded.
  await domToBlob(node, RENDER_OPTIONS);

  const blob = await domToBlob(node, RENDER_OPTIONS);
  if (!blob) throw new Error("Slide gagal dibuat. Coba lagi.");
  return blob;
}
