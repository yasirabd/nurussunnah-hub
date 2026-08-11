# Cloudflare Local Arabic Font Design

## Problem

Cloudflare clean builds fail because `next/font/google` generates obsolete Noto Sans Arabic WOFF2 URLs that now return HTTP 404. The failure occurs before OpenNext packaging and is independent of application data or Supabase migrations.

## Design

Self-host the existing Noto Sans Arabic weights 300, 400, and 500 under `src/app/fonts/`. Load them with `next/font/local` in the root layout and keep the existing `--font-arabic` CSS variable, so the Arabic login greeting retains its typography without any build-time Google Fonts request.

Geist and Geist Mono remain unchanged. No component or visual layout changes are included.

## Verification

- A source-contract test rejects `Noto_Sans_Arabic` from `next/font/google` and requires local font files.
- `npm test` and `npx tsc --noEmit` must pass.
- `npm run build:cloudflare` must finish successfully without a Noto Sans Arabic download error.
