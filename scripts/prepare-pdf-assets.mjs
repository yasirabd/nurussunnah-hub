import { cpSync, mkdirSync } from 'node:fs';

// Keep font maps and scan decoders local; PDFs never go to a third-party viewer.
for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
  const target = new URL(`../public/pdfjs/${directory}/`, import.meta.url);
  mkdirSync(target, { recursive: true });
  cpSync(new URL(`../node_modules/pdfjs-dist/${directory}/`, import.meta.url), target, { recursive: true });
}
