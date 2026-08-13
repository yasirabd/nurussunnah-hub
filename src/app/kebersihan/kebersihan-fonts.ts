import localFont from "next/font/local";

// Plus Jakarta Sans and Lora are variable fonts: Google serves one file per
// unicode-range with the weight axis inside, so a single latin file covers
// every weight the carousel uses. Amiri is static; only weight 700 is used,
// by the hadith on slide 1.
//
// These are self-hosted rather than fetched from Google's CDN at build time
// for two reasons: Cloudflare builds have broken before on stale WOFF2 URLs,
// and the client-side rasterizer can only inline same-origin fonts.

const jakarta = localFont({
  src: "../fonts/plus-jakarta-sans-latin.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-jakarta",
  display: "swap",
});

const lora = localFont({
  src: "../fonts/lora-italic-latin.woff2",
  weight: "400 700",
  style: "italic",
  variable: "--font-lora",
  display: "swap",
});

const amiri = localFont({
  src: "../fonts/amiri-arabic-700.woff2",
  weight: "700",
  style: "normal",
  variable: "--font-amiri",
  display: "swap",
});

export const kebersihanFontVariables = `${jakarta.variable} ${lora.variable} ${amiri.variable}`;
