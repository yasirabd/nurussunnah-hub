# Cloudflare Local Arabic Font Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cloudflare builds independent of Google Fonts for Noto Sans Arabic.

**Architecture:** Store the three required font weights in the app source and load them through `next/font/local`. Preserve the existing CSS variable contract so consumers do not change.

**Tech Stack:** Next.js 16, TypeScript, OpenNext Cloudflare, Node test runner

---

### Task 1: Self-Hosted Arabic Font

**Files:**
- Create: `tests/local-arabic-font.test.mjs`
- Create: `src/app/fonts/noto-sans-arabic-300.ttf`
- Create: `src/app/fonts/noto-sans-arabic-400.ttf`
- Create: `src/app/fonts/noto-sans-arabic-500.ttf`
- Modify: `src/app/layout.tsx`

- [ ] Write a failing source-contract test requiring `next/font/local` and all three local paths.
- [ ] Run `node --test tests/local-arabic-font.test.mjs` and confirm it fails on the Google font import.
- [ ] Download the three official Noto Sans Arabic font files returned by Google Fonts CSS.
- [ ] Replace `Noto_Sans_Arabic` with a `localFont` declaration using weights 300, 400, and 500 and variable `--font-arabic`.
- [ ] Run the focused test, TypeScript, full tests, and `npm run build:cloudflare`.
- [ ] Commit the verified fix.
