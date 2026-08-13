# Lomba Kebersihan Carousel Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public `/kebersihan` page that turns five work-area photos into four 1080×1350 Instagram carousel slides using the official Nurus Sunnah design, entirely in the participant's browser.

**Architecture:** The four slides are ported from the committed design source at `docs/superpowers/reference/twibbon-lomba-kebersihan-v2.html` into React components that render real DOM at exactly 1080×1350, then rasterized client-side with `modern-screenshot`. All arithmetic and string-building lives in pure `.mjs` modules tested with `node --test`. No database, no upload, no server action — the page issues zero network requests for user data.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, `modern-screenshot@4.7.0`, `next/font/local`, `node --test`.

## Global Constraints

- Design source of truth is `docs/superpowers/reference/twibbon-lomba-kebersihan-v2.html`. Port it **verbatim** — do not add, remove, restyle, or re-position any visual element.
- Slide root elements must be exactly `width: 1080px` and `height: 1350px`.
- Three fonts are self-hosted via `next/font/local`. **Never** use `next/font/google` — Cloudflare builds have broken on stale Google WOFF2 URLs before, and cross-origin font URLs cannot be inlined by the rasterizer.
- Modules in `src/lib/kebersihan/*.mjs` must not import from `next`, `react`, or any browser API.
- Every `.mjs` module gets a sibling `.d.mts` declaration file, matching the existing pattern at `src/lib/auth/feature-access-policy.mjs`.
- The page must issue **no** `fetch` and **no** server action carrying user data.
- Indonesian for all user-facing copy.
- Instagram handle is exactly `@nurussunnah.ig`.
- Run `npm test` after every task. All pre-existing tests must keep passing.
- Commit after every task.

---

### Task 1: Extract public-route decision into a pure module

The current middleware uses `.includes(url.pathname)` exact matching, which cannot express "`/kebersihan` and everything under it".

**Files:**
- Create: `src/lib/auth/public-routes.mjs`
- Create: `src/lib/auth/public-routes.d.mts`
- Modify: `src/lib/supabase/middleware.ts:39-46`
- Test: `tests/kebersihan-public-route.test.mjs`

**Interfaces:**
- Produces: `isPublicRoute(pathname: string): boolean`, `AUTH_PASS_THROUGH_ROUTES: string[]`

- [ ] **Step 1: Write the failing test**

Create `tests/kebersihan-public-route.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AUTH_PASS_THROUGH_ROUTES,
  isPublicRoute,
} from "../src/lib/auth/public-routes.mjs";

test("kebersihan generator is reachable without a session", () => {
  assert.equal(isPublicRoute("/kebersihan"), true);
  assert.equal(isPublicRoute("/kebersihan/apa-pun"), true);
});

test("existing public routes keep working", () => {
  assert.equal(isPublicRoute("/auth/login"), true);
  assert.equal(isPublicRoute("/auth/forgot-password"), true);
  assert.equal(isPublicRoute("/register"), true);
  for (const route of AUTH_PASS_THROUGH_ROUTES) {
    assert.equal(isPublicRoute(route), true, `${route} must stay public`);
  }
});

test("dashboard stays behind the session gate", () => {
  assert.equal(isPublicRoute("/dashboard"), false);
  assert.equal(isPublicRoute("/dashboard/employees"), false);
  assert.equal(isPublicRoute("/"), false);
});

test("prefix match does not leak to lookalike paths", () => {
  assert.equal(isPublicRoute("/kebersihanx"), false);
  assert.equal(isPublicRoute("/registerx"), false);
});

test("middleware delegates the decision to the pure module", () => {
  const middleware = readFileSync("src/lib/supabase/middleware.ts", "utf8");
  assert.match(middleware, /import \{[^}]*isPublicRoute[^}]*\} from '@\/lib\/auth\/public-routes\.mjs'/);
  // Must be CALLED with the path. `!isPublicRoute` on a function is always
  // false, which would silently open every dashboard route to the public.
  assert.match(middleware, /!isPublicRoute\(url\.pathname\)/);
  assert.doesNotMatch(middleware, /const isPublicRoute =/);
  assert.doesNotMatch(middleware, /'\/auth\/forgot-password'/);
});

test("the session guard still redirects anonymous dashboard traffic", () => {
  const middleware = readFileSync("src/lib/supabase/middleware.ts", "utf8");
  assert.match(middleware, /if \(!user && !isPublicRoute\(url\.pathname\)\) \{/);
  assert.match(middleware, /url\.pathname = '\/auth\/login'/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="kebersihan generator is reachable"`
Expected: FAIL — cannot find module `public-routes.mjs`

- [ ] **Step 3: Write the module**

Create `src/lib/auth/public-routes.mjs`:

```js
export const AUTH_PASS_THROUGH_ROUTES = [
  '/auth/callback',
  '/auth/logout',
  '/auth/reset-password',
]

const PUBLIC_EXACT_ROUTES = [
  '/auth/login',
  '/auth/forgot-password',
  '/register',
  ...AUTH_PASS_THROUGH_ROUTES,
]

const PUBLIC_PREFIX_ROUTES = ['/kebersihan']

export function isPublicRoute(pathname) {
  if (PUBLIC_EXACT_ROUTES.includes(pathname)) return true
  return PUBLIC_PREFIX_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
```

Create `src/lib/auth/public-routes.d.mts`:

```ts
export const AUTH_PASS_THROUGH_ROUTES: string[]
export function isPublicRoute(pathname: string): boolean
```

- [ ] **Step 4: Rewire the middleware**

In `src/lib/supabase/middleware.ts`, add the import at the top:

```ts
import { AUTH_PASS_THROUGH_ROUTES, isPublicRoute } from '@/lib/auth/public-routes.mjs'
```

Replace lines 39–56 — the `isAuthRoute` / `authPassThroughRoutes` / `isPublicRoute` block **and both `if` blocks below it** — with:

```ts
  const isAuthRoute = url.pathname.startsWith('/auth')

  if (!user && !isPublicRoute(url.pathname)) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute && !AUTH_PASS_THROUGH_ROUTES.includes(url.pathname)) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }
```

**This rewrite is mandatory, not cosmetic.** In the current file `isPublicRoute`
is a `const` holding a boolean, so the guard reads `!isPublicRoute`. Importing a
function under the same name without changing the call site turns that into
`!someFunction`, which is always `false` — the session guard would silently stop
firing and every dashboard route would become public. The call site must pass
`url.pathname`.

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS, including `tests/cloudflare-middleware.test.mjs` and `tests/password-change-access-gate.test.mjs`

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/public-routes.mjs src/lib/auth/public-routes.d.mts src/lib/supabase/middleware.ts tests/kebersihan-public-route.test.mjs
git commit -m "feat: open /kebersihan to visitors without a session"
```

---

### Task 2: Unit list and export filenames

**Files:**
- Create: `src/lib/kebersihan/units.mjs`, `src/lib/kebersihan/units.d.mts`
- Create: `src/lib/kebersihan/filenames.mjs`, `src/lib/kebersihan/filenames.d.mts`
- Test: `tests/kebersihan-filenames.test.mjs`

**Interfaces:**
- Produces: `UNIT_OPTIONS: string[]`, `UNIT_OTHER: string`, `slideFileName({ unit, area, slide }): string`

- [ ] **Step 1: Write the failing test**

Create `tests/kebersihan-filenames.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { UNIT_OPTIONS, UNIT_OTHER } from "../src/lib/kebersihan/units.mjs";
import { slideFileName } from "../src/lib/kebersihan/filenames.mjs";

test("unit list offers the free-text escape hatch last", () => {
  assert.equal(UNIT_OPTIONS.length, 10);
  assert.equal(UNIT_OPTIONS[0], "Yayasan");
  assert.equal(UNIT_OPTIONS.at(-1), UNIT_OTHER);
  assert.equal(new Set(UNIT_OPTIONS).size, UNIT_OPTIONS.length);
});

test("filename carries the slide number so carousel order survives", () => {
  const name = slideFileName({
    unit: "SMP Islam Nurus Sunnah",
    area: "Laboratorium Komputer",
    slide: 1,
  });
  assert.equal(
    name,
    "Kebersihan-2026_SMP-Islam-Nurus-Sunnah_Laboratorium-Komputer_Slide-1.jpg"
  );
});

test("filename sanitises punctuation and collapses separators", () => {
  const name = slideFileName({
    unit: "PPTQ / Pondok",
    area: "Ruang Guru (Lt. 2)",
    slide: 3,
  });
  assert.equal(name, "Kebersihan-2026_PPTQ-Pondok_Ruang-Guru-Lt-2_Slide-3.jpg");
});

test("filename truncates long segments to 32 characters", () => {
  const name = slideFileName({
    unit: "Yayasan",
    area: "Ruang Administrasi dan Pelayanan Umum Terpadu",
    slide: 4,
  });
  const areaSegment = name.split("_")[2];
  assert.ok(areaSegment.length <= 32, `too long: ${areaSegment}`);
  assert.equal(areaSegment, "Ruang-Administrasi-dan-Pelayanan");
});

test("filename never emits a leading or trailing dash", () => {
  const name = slideFileName({ unit: "  Yayasan  ", area: "!! Dapur !!", slide: 2 });
  assert.equal(name, "Kebersihan-2026_Yayasan_Dapur_Slide-2.jpg");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="unit list offers"`
Expected: FAIL — cannot find module `units.mjs`

- [ ] **Step 3: Write the modules**

Create `src/lib/kebersihan/units.mjs`:

```js
export const UNIT_OTHER = 'Unit lainnya'

export const UNIT_OPTIONS = [
  'Yayasan',
  'KB-TK Islam Nurus Sunnah',
  'SD Islam Nurus Sunnah',
  'SMP Islam Nurus Sunnah',
  'MA Nurus Sunnah',
  'PPTQ Nurus Sunnah',
  'Pondok Nurus Sunnah',
  'TPA Nurus Sunnah',
  'NUSA Boarding School',
  UNIT_OTHER,
]
```

Create `src/lib/kebersihan/units.d.mts`:

```ts
export const UNIT_OTHER: string
export const UNIT_OPTIONS: string[]
```

Create `src/lib/kebersihan/filenames.mjs`:

```js
const MAX_SEGMENT = 32

function slugify(value) {
  const cleaned = String(value ?? '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (cleaned.length <= MAX_SEGMENT) return cleaned
  return cleaned.slice(0, MAX_SEGMENT).replace(/-+$/g, '')
}

export function slideFileName({ unit, area, slide }) {
  return `Kebersihan-2026_${slugify(unit)}_${slugify(area)}_Slide-${slide}.jpg`
}
```

Create `src/lib/kebersihan/filenames.d.mts`:

```ts
export function slideFileName(input: {
  unit: string
  area: string
  slide: number
}): string
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/kebersihan tests/kebersihan-filenames.test.mjs
git commit -m "feat: add kebersihan unit list and slide filenames"
```

---

### Task 3: Instagram caption and WhatsApp submission text

**Files:**
- Create: `src/lib/kebersihan/caption.mjs`, `src/lib/kebersihan/caption.d.mts`
- Test: `tests/kebersihan-caption.test.mjs`

**Interfaces:**
- Produces: `instagramCaption({ unit, area, members }): string`, `instagramCaptionShort({ unit, area, members }): string`, `whatsappSubmission({ unit, area, members, link }): string`, `HASHTAGS: string[]`

- [ ] **Step 1: Write the failing test**

Create `tests/kebersihan-caption.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  HASHTAGS,
  instagramCaption,
  instagramCaptionShort,
  whatsappSubmission,
} from "../src/lib/kebersihan/caption.mjs";

const sample = {
  unit: "SMP Islam Nurus Sunnah",
  area: "Laboratorium Komputer",
  members: ["Ahmad", "Fulan", "Fulanah"],
};

test("caption names the area, the unit, and every member", () => {
  const caption = instagramCaption(sample);
  assert.match(caption, /Laboratorium Komputer/);
  assert.match(caption, /SMP Islam Nurus Sunnah/);
  assert.match(caption, /1\. Ahmad/);
  assert.match(caption, /2\. Fulan/);
  assert.match(caption, /3\. Fulanah/);
});

test("caption mentions the official account", () => {
  assert.match(instagramCaption(sample), /@nurussunnah\.ig/);
});

test("caption uses at most five hashtags", () => {
  const caption = instagramCaption(sample);
  const found = caption.match(/#\w+/g) ?? [];
  assert.ok(found.length <= 5, `found ${found.length}`);
  assert.equal(found.length, HASHTAGS.length);
});

test("short caption still lists every member", () => {
  const short = instagramCaptionShort(sample);
  for (const member of sample.members) {
    assert.ok(short.includes(member), `missing ${member}`);
  }
  assert.ok(short.length < instagramCaption(sample).length);
});

test("whatsapp submission carries unit, area, members and link", () => {
  const message = whatsappSubmission({ ...sample, link: "https://instagram.com/p/abc" });
  assert.match(message, /Unit: SMP Islam Nurus Sunnah/);
  assert.match(message, /Area: Laboratorium Komputer/);
  assert.match(message, /1\. Ahmad/);
  assert.match(message, /https:\/\/instagram\.com\/p\/abc/);
});

test("missing link becomes a visible prompt, not a blank line", () => {
  const message = whatsappSubmission({ ...sample, link: "" });
  assert.match(message, /\(tempel link postingan di sini\)/);
});

test("a single member still renders as a numbered list", () => {
  assert.match(instagramCaption({ ...sample, members: ["Ahmad"] }), /1\. Ahmad/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="caption names the area"`
Expected: FAIL — cannot find module `caption.mjs`

- [ ] **Step 3: Write the module**

Create `src/lib/kebersihan/caption.mjs`:

```js
export const HASHTAGS = [
  '#LombaKebersihanNurusSunnah',
  '#BersihTempatnyaBanggaMenjaganya',
  '#NurusSunnah',
  '#HUTRI81',
  '#CerdasMandiriBerkarakterQurani',
]

const LINK_PLACEHOLDER = '(tempel link postingan di sini)'

function numberedMembers(members) {
  return (members ?? [])
    .map((name, index) => `${index + 1}. ${name}`)
    .join('\n')
}

export function instagramCaption({ unit, area, members }) {
  return [
    '🇮🇩 Bersih Tempatnya, Bangga Menjaganya',
    '',
    'Dalam semangat HUT ke-81 Republik Indonesia, kami berikhtiar menjaga tempat kami bekerja dan berkhidmat agar tetap bersih, rapi, nyaman, dan terawat.',
    '',
    `📍 Area: ${area}`,
    `🏫 Unit: ${unit}`,
    '',
    'Anggota area:',
    numberedMembers(members),
    '',
    'Di Nurus Sunnah, kami belajar untuk cerdas dalam menata, mandiri dalam menjaga, dan menjadikan kebersihan sebagai bagian dari amanah dalam berkhidmat.',
    '',
    'Karena rasa memiliki tidak cukup hanya diucapkan. Ia terlihat dari bagaimana kita menjaga tempat yang telah Allah amanahkan kepada kita.',
    '',
    'Bersih Tempatnya, Bangga Menjaganya.',
    'Cerdas • Mandiri • Berkarakter Qur’ani',
    '',
    '@nurussunnah.ig',
    '',
    HASHTAGS.join(' '),
  ].join('\n')
}

export function instagramCaptionShort({ unit, area, members }) {
  return [
    '🇮🇩 Bersih Tempatnya, Bangga Menjaganya',
    '',
    `📍 Area: ${area}`,
    `🏫 Unit: ${unit}`,
    '',
    'Anggota area:',
    numberedMembers(members),
    '',
    'Cerdas • Mandiri • Berkarakter Qur’ani',
    '',
    '@nurussunnah.ig',
    '',
    HASHTAGS.join(' '),
  ].join('\n')
}

export function whatsappSubmission({ unit, area, members, link }) {
  return [
    '🇮🇩 Lomba Kebersihan Nurus Sunnah 2026',
    '',
    `🏫 Unit: ${unit}`,
    `📍 Area: ${area}`,
    '',
    '👥 Anggota:',
    numberedMembers(members),
    '',
    '🔗 Instagram:',
    link ? link : LINK_PLACEHOLDER,
  ].join('\n')
}
```

Create `src/lib/kebersihan/caption.d.mts`:

```ts
interface AreaIdentity {
  unit: string
  area: string
  members: string[]
}

export const HASHTAGS: string[]
export function instagramCaption(input: AreaIdentity): string
export function instagramCaptionShort(input: AreaIdentity): string
export function whatsappSubmission(
  input: AreaIdentity & { link: string }
): string
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/kebersihan/caption.mjs src/lib/kebersihan/caption.d.mts tests/kebersihan-caption.test.mjs
git commit -m "feat: generate kebersihan caption and whatsapp submission text"
```

---

### Task 4: Photo slot sizes and crop slider axes

Showing a position slider on an axis with no slack only confuses participants, so the UI asks this module which sliders to render.

**Files:**
- Create: `src/lib/kebersihan/slot-sizes.mjs`, `src/lib/kebersihan/slot-sizes.d.mts`
- Create: `src/lib/kebersihan/crop-axes.mjs`, `src/lib/kebersihan/crop-axes.d.mts`
- Test: `tests/kebersihan-crop-axes.test.mjs`

**Interfaces:**
- Produces: `SLOT_SIZES: Record<SlotId, { width: number; height: number }>`, `SLOT_IDS: SlotId[]`, `SLOT_LABELS: Record<SlotId, string>`, `positionAxes(imgW, imgH, boxW, boxH, zoom): { x: boolean; y: boolean }`
- `SlotId` is `'hero' | 'wide' | 'detail' | 'before' | 'after'`

Slot sizes come from the design source: `hero` fills the slide; `wide` and `detail` come from the container `top:130 left:36 right:36 bottom:340` on a 1080×1350 canvas → 1008×880.

- [ ] **Step 1: Write the failing test**

Create `tests/kebersihan-crop-axes.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { SLOT_IDS, SLOT_LABELS, SLOT_SIZES } from "../src/lib/kebersihan/slot-sizes.mjs";
import { positionAxes } from "../src/lib/kebersihan/crop-axes.mjs";

test("there are five slots, each labelled for the participant", () => {
  assert.deepEqual(SLOT_IDS, ["hero", "wide", "detail", "before", "after"]);
  for (const id of SLOT_IDS) {
    assert.ok(SLOT_LABELS[id].length > 0, `${id} needs a label`);
    assert.ok(SLOT_SIZES[id].width > 0 && SLOT_SIZES[id].height > 0);
  }
});

test("slot sizes match the design source", () => {
  assert.deepEqual(SLOT_SIZES.hero, { width: 1080, height: 1350 });
  assert.deepEqual(SLOT_SIZES.wide, { width: 1008, height: 880 });
  assert.deepEqual(SLOT_SIZES.detail, { width: 1008, height: 880 });
  assert.deepEqual(SLOT_SIZES.before, { width: 620, height: 440 });
  assert.deepEqual(SLOT_SIZES.after, { width: 740, height: 450 });
});

test("a photo wider than its slot can only be panned horizontally", () => {
  // 4000x3000 (1.333) into hero 1080x1350 (0.8): cover crops the sides
  assert.deepEqual(positionAxes(4000, 3000, 1080, 1350, 1), { x: true, y: false });
});

test("a photo taller than its slot can only be panned vertically", () => {
  // 3000x4000 (0.75) into wide 1008x880 (1.145): cover crops top and bottom
  assert.deepEqual(positionAxes(3000, 4000, 1008, 880, 1), { x: false, y: true });
});

test("a photo matching its slot ratio needs no position slider", () => {
  assert.deepEqual(positionAxes(2160, 2700, 1080, 1350, 1), { x: false, y: false });
});

test("zooming in creates slack on both axes", () => {
  assert.deepEqual(positionAxes(2160, 2700, 1080, 1350, 1.4), { x: true, y: true });
});

test("degenerate input never reports slack", () => {
  assert.deepEqual(positionAxes(0, 0, 1080, 1350, 1), { x: false, y: false });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="there are five slots"`
Expected: FAIL — cannot find module `slot-sizes.mjs`

- [ ] **Step 3: Write the modules**

Create `src/lib/kebersihan/slot-sizes.mjs`:

```js
export const SLOT_IDS = ['hero', 'wide', 'detail', 'before', 'after']

export const SLOT_SIZES = {
  hero: { width: 1080, height: 1350 },
  wide: { width: 1008, height: 880 },
  detail: { width: 1008, height: 880 },
  before: { width: 620, height: 440 },
  after: { width: 740, height: 450 },
}

export const SLOT_LABELS = {
  hero: 'Foto 1 — Hero (tampilan terbaik area)',
  wide: 'Foto 2 — Wide View (kondisi menyeluruh)',
  detail: 'Foto 3 — Detail (meja, rak, label, sudut ruang)',
  before: 'Foto 4 — SEBELUM',
  after: 'Foto 5 — SESUDAH',
}
```

Create `src/lib/kebersihan/slot-sizes.d.mts`:

```ts
export type SlotId = 'hero' | 'wide' | 'detail' | 'before' | 'after'

export const SLOT_IDS: SlotId[]
export const SLOT_SIZES: Record<SlotId, { width: number; height: number }>
export const SLOT_LABELS: Record<SlotId, string>
```

Create `src/lib/kebersihan/crop-axes.mjs`:

```js
const EPSILON = 0.001

export function positionAxes(imgW, imgH, boxW, boxH, zoom = 1) {
  if (!(imgW > 0) || !(imgH > 0) || !(boxW > 0) || !(boxH > 0)) {
    return { x: false, y: false }
  }

  // object-fit: cover scales by the larger ratio, then transform: scale(zoom)
  const cover = Math.max(boxW / imgW, boxH / imgH) * (zoom || 1)
  const renderedW = imgW * cover
  const renderedH = imgH * cover

  return {
    x: renderedW - boxW > EPSILON,
    y: renderedH - boxH > EPSILON,
  }
}
```

Create `src/lib/kebersihan/crop-axes.d.mts`:

```ts
export function positionAxes(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
  zoom?: number
): { x: boolean; y: boolean }
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/kebersihan/slot-sizes.mjs src/lib/kebersihan/slot-sizes.d.mts src/lib/kebersihan/crop-axes.mjs src/lib/kebersihan/crop-axes.d.mts tests/kebersihan-crop-axes.test.mjs
git commit -m "feat: derive kebersihan crop slider axes from slot geometry"
```

---

### Task 5: Self-hosted fonts and design assets

**Files:**
- Create: `src/app/fonts/plus-jakarta-sans-latin.woff2`
- Create: `src/app/fonts/lora-italic-latin.woff2`
- Create: `src/app/fonts/amiri-arabic-700.woff2`
- Create: `public/kebersihan/logo.png`
- Create: `public/kebersihan/hut81.webp`
- Create: `src/app/kebersihan/kebersihan-fonts.ts`
- Test: `tests/kebersihan-assets.test.mjs`

**Interfaces:**
- Produces: `kebersihanFontVariables: string` — a className string exposing `--font-jakarta`, `--font-lora`, `--font-amiri`

Plus Jakarta Sans and Lora are variable fonts: Google serves one file per unicode-range with the weight axis inside, so one latin file covers weights 400–800 (and 500–600 italic for Lora). Amiri is static; only weight 700 is used, by the hadith on slide 1.

- [ ] **Step 1: Download the fonts and copy the assets**

```bash
mkdir -p src/app/fonts public/kebersihan
curl -sL -o src/app/fonts/plus-jakarta-sans-latin.woff2 "https://fonts.gstatic.com/s/plusjakartasans/v12/LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yw.woff2"
curl -sL -o src/app/fonts/lora-italic-latin.woff2 "https://fonts.gstatic.com/s/lora/v37/0QIhMX1D_JOuMw_LIftL.woff2"
curl -sL -o src/app/fonts/amiri-arabic-700.woff2 "https://fonts.gstatic.com/s/amiri/v30/J7acnpd8CGxBHp2VkaY6zp5yGw.woff2"
cp "C:/Users/Dell/Downloads/logo nurussunnah (4).png" public/kebersihan/logo.png
cp "C:/Users/Dell/Downloads/81_RI_2026.svg.webp" public/kebersihan/hut81.webp
```

- [ ] **Step 2: Write the failing test**

Create `tests/kebersihan-assets.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const FONTS = [
  "src/app/fonts/plus-jakarta-sans-latin.woff2",
  "src/app/fonts/lora-italic-latin.woff2",
  "src/app/fonts/amiri-arabic-700.woff2",
];

test("carousel fonts are self-hosted and real", () => {
  for (const path of FONTS) {
    const size = statSync(path).size;
    assert.ok(size > 5_000, `${path} is only ${size} bytes`);
    const magic = readFileSync(path).subarray(0, 4).toString("latin1");
    assert.equal(magic, "wOF2", `${path} is not a woff2 file`);
  }
});

test("design assets are present", () => {
  assert.ok(statSync("public/kebersihan/logo.png").size > 10_000);
  assert.ok(statSync("public/kebersihan/hut81.webp").size > 10_000);
});

test("carousel fonts never come from next/font/google", () => {
  const fonts = readFileSync("src/app/kebersihan/kebersihan-fonts.ts", "utf8");
  assert.match(fonts, /next\/font\/local/);
  assert.doesNotMatch(fonts, /next\/font\/google/);
  for (const variable of ["--font-jakarta", "--font-lora", "--font-amiri"]) {
    assert.ok(fonts.includes(variable), `missing ${variable}`);
  }
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="carousel fonts never come"`
Expected: FAIL — cannot read `kebersihan-fonts.ts`

- [ ] **Step 4: Write the font module**

Create `src/app/kebersihan/kebersihan-fonts.ts`:

```ts
import localFont from "next/font/local";

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
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/fonts public/kebersihan src/app/kebersihan/kebersihan-fonts.ts tests/kebersihan-assets.test.mjs
git commit -m "feat: self-host carousel fonts and design assets"
```

---

### Task 6: Design tokens and shared slide chrome

Four blocks repeat across slides. Extracting them first means the four slide ports stay readable and cannot drift apart.

**Files:**
- Create: `src/app/kebersihan/_components/slides/tokens.ts`
- Create: `src/app/kebersihan/_components/slides/promo-bar.tsx`
- Create: `src/app/kebersihan/_components/slides/slide-header.tsx`
- Create: `src/app/kebersihan/_components/slides/bunting.tsx`
- Test: `tests/kebersihan-slide-contract.test.mjs`

**Interfaces:**
- Produces: `COLORS`, `CARD_GRADIENT`, `CARD_SHADOW`, `PROMO_GRADIENT`, `PAPER_BACKGROUND`, `BUNTING_COLORS`, `SLIDE_WIDTH`, `SLIDE_HEIGHT` from `tokens.ts`; `<PromoBar />`, `<SlideHeader />`, `<Bunting />`

All values are copied verbatim from `docs/superpowers/reference/twibbon-lomba-kebersihan-v2.html`.

- [ ] **Step 1: Write the failing test**

Create `tests/kebersihan-slide-contract.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tokens = readFileSync("src/app/kebersihan/_components/slides/tokens.ts", "utf8");

test("slide canvas is locked to the Instagram 4:5 size", () => {
  assert.match(tokens, /SLIDE_WIDTH = 1080/);
  assert.match(tokens, /SLIDE_HEIGHT = 1350/);
});

test("brand colours match the design source", () => {
  for (const hex of ["#0B4A2B", "#FDFCF8", "#C9A24B", "#E4C87F", "#B7212A", "#0B3A21"]) {
    assert.ok(tokens.includes(hex), `token file missing ${hex}`);
  }
});

test("bunting alternates cream and red across 24 flags", () => {
  const bunting = readFileSync("src/app/kebersihan/_components/slides/bunting.tsx", "utf8");
  assert.match(bunting, /24/);
  assert.match(bunting, /#FDFCF8/);
  assert.match(bunting, /#B7212A/);
  assert.match(bunting, /polygon\(0 0, 100% 0, 50% 100%\)/);
});

test("promo bar keeps the SPMB copy exactly as designed", () => {
  const promo = readFileSync("src/app/kebersihan/_components/slides/promo-bar.tsx", "utf8");
  assert.match(promo, /SPMB 2027\/2028 TELAH DIBUKA/);
  assert.match(promo, /nurussunnah\.sch\.id\/ppdb/);
});

test("header points at the self-hosted assets", () => {
  const header = readFileSync("src/app/kebersihan/_components/slides/slide-header.tsx", "utf8");
  assert.match(header, /\/kebersihan\/logo\.png/);
  assert.match(header, /\/kebersihan\/hut81\.webp/);
  assert.match(header, /Lomba Kebersihan Nurus Sunnah 2026/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="slide canvas is locked"`
Expected: FAIL — cannot read `tokens.ts`

- [ ] **Step 3: Write the tokens**

Create `src/app/kebersihan/_components/slides/tokens.ts`:

```ts
export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;

export const COLORS = {
  green: "#0B4A2B",
  greenDeep: "#083A21",
  greenLift: "#11663C",
  greenInk: "#0B3A21",
  cream: "#FDFCF8",
  gold: "#C9A24B",
  goldLight: "#E4C87F",
  goldTop: "#D9B564",
  goldDeep: "#B08A38",
  red: "#B7212A",
} as const;

export const CARD_GRADIENT =
  "linear-gradient(145deg,#11663C 0%,#0B4A2B 55%,#083A21 100%)";

export const CARD_SHADOW =
  "0 26px 60px rgba(11,74,43,0.38), 0 6px 14px rgba(11,74,43,0.22), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(255,255,255,0.06)";

export const PROMO_GRADIENT =
  "linear-gradient(180deg,#D9B564,#C9A24B 45%,#B08A38)";

export const PAPER_BACKGROUND =
  "radial-gradient(circle at 88% 6%, rgba(201,162,75,0.14), transparent 26%), radial-gradient(circle at 4% 96%, rgba(11,74,43,0.1), transparent 30%), repeating-linear-gradient(135deg, rgba(11,74,43,0.05) 0 2px, transparent 2px 28px)";

export const BUNTING_COLORS = Array.from({ length: 24 }, (_, i) =>
  i % 2 ? COLORS.cream : COLORS.red
);

export const FONT_SANS = "var(--font-jakarta), sans-serif";
export const FONT_SERIF_ITALIC = "var(--font-lora), serif";
export const FONT_ARABIC = "var(--font-amiri), serif";
```

- [ ] **Step 4: Write the shared chrome components**

Create `src/app/kebersihan/_components/slides/promo-bar.tsx`:

```tsx
import { COLORS, PROMO_GRADIENT } from "./tokens";

export function PromoBar({ height = 56 }: { height?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        background: PROMO_GRADIENT,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: height === 58 ? 16 : 14,
        zIndex: 3,
      }}
    >
      <div
        style={{
          color: COLORS.greenInk,
          fontSize: height === 58 ? 24 : 23,
          fontWeight: 800,
          letterSpacing: height === 58 ? "0.03em" : undefined,
          whiteSpace: "nowrap",
        }}
      >
        SPMB 2027/2028 TELAH DIBUKA
      </div>
      <div
        style={{
          width: 8,
          height: 8,
          background: COLORS.greenInk,
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          color: COLORS.greenInk,
          fontSize: height === 58 ? 24 : 23,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        nurussunnah.sch.id/ppdb
      </div>
    </div>
  );
}
```

Create `src/app/kebersihan/_components/slides/slide-header.tsx`:

```tsx
import { COLORS } from "./tokens";

export function SlideHeader({ zIndex = 2 }: { zIndex?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 44px",
        zIndex,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kebersihan/logo.png" alt="" style={{ width: 64, height: "auto" }} />
        <div style={{ color: COLORS.green, fontSize: 23, fontWeight: 700 }}>
          Lomba Kebersihan Nurus Sunnah 2026
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/kebersihan/hut81.webp"
        alt="HUT RI ke-81"
        style={{ height: 78, width: "auto" }}
      />
    </div>
  );
}
```

Create `src/app/kebersihan/_components/slides/bunting.tsx`:

```tsx
import { BUNTING_COLORS } from "./tokens";

export function Bunting() {
  return (
    <div
      style={{
        position: "absolute",
        top: 126,
        left: -8,
        right: -8,
        display: "flex",
        justifyContent: "space-between",
        zIndex: 2,
        pointerEvents: "none",
        filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.2))",
      }}
    >
      {BUNTING_COLORS.map((color, index) => (
        <div
          key={index}
          style={{
            width: 44,
            height: 36,
            background: color,
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, no type errors

- [ ] **Step 6: Commit**

```bash
git add src/app/kebersihan/_components/slides tests/kebersihan-slide-contract.test.mjs
git commit -m "feat: add carousel design tokens and shared slide chrome"
```

---

### Task 7: Decorative illustration components

The design draws a broom, a spray bottle, a bucket, soap bubbles and eight-point sparkles out of nested absolutely-positioned divs. Each appears several times with different colours, rotations and positions.

**Files:**
- Create: `src/app/kebersihan/_components/slides/decorations.tsx`
- Test: extend `tests/kebersihan-slide-contract.test.mjs`

**Interfaces:**
- Consumes: `COLORS` from `./tokens`
- Produces: `<Sparkle size color style />`, `<Bubble size borderColor fillColor style />`, `<Broom style bandColor headStyle />`, `<SprayBottle style bodyGradient capColor accentColor />`, `<Bucket style />`

**Porting rules — apply these to every element copied from the reference file:**

| In the design source | In React |
|---|---|
| `style="top:12px; background:#fff"` | `style={{ top: 12, background: "#fff" }}` |
| hyphenated CSS property | camelCase (`clip-path` → `clipPath`, `box-shadow` → `boxShadow`) |
| numeric px value | bare number (React appends `px`) |
| non-px value (`50%`, `999px`, `rotate(3deg)`) | quoted string |
| `&bull;` `&mdash;` `&rsquo;` `&ldquo;` `&rdquo;` `&amp;` | `•` `—` `’` `“` `”` `&` |
| `font-family:'Amiri',serif` | `fontFamily: FONT_ARABIC` |
| `font-family:'Lora',serif` | `fontFamily: FONT_SERIF_ITALIC` |
| `src="assets/logo.png"` | `src="/kebersihan/logo.png"` |
| `src="assets/hut81.webp"` | `src="/kebersihan/hut81.webp"` |
| `<image-slot id="wide-photo">` | `<PhotoSlot slot="wide" />` |
| `<sc-for list="{{ bunting }}">` | `<Bunting />` |
| `{{ areaName }}` | `{areaName}` |
| the outer `display:flex` gallery wrapper and the `SLIDE n — …` label div | dropped entirely |

The eight-point sparkle path is `polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)` everywhere it appears.

- [ ] **Step 1: Add the failing test**

Append to `tests/kebersihan-slide-contract.test.mjs`:

```js
test("decorations expose the reusable ornament primitives", () => {
  const deco = readFileSync(
    "src/app/kebersihan/_components/slides/decorations.tsx",
    "utf8"
  );
  for (const name of ["Sparkle", "Bubble", "Broom", "SprayBottle", "Bucket"]) {
    assert.match(deco, new RegExp(`export function ${name}`), `missing ${name}`);
  }
  assert.match(
    deco,
    /polygon\(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%\)/
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="decorations expose"`
Expected: FAIL — cannot read `decorations.tsx`

- [ ] **Step 3: Write the decorations**

Create `src/app/kebersihan/_components/slides/decorations.tsx`. Port the ornament markup from the reference file. Start from this skeleton and fill each body by copying the corresponding nested divs from the reference, applying the porting rules above:

```tsx
import type { CSSProperties } from "react";

const SPARKLE_PATH =
  "polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)";

export function Sparkle({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        background: color,
        clipPath: SPARKLE_PATH,
        ...style,
      }}
    />
  );
}

export function Bubble({
  size,
  border,
  fill = "rgba(255,255,255,0.16)",
  highlight,
  style,
}: {
  size: number;
  border: string;
  fill?: string;
  highlight?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: fill,
        border,
        pointerEvents: "none",
        ...style,
      }}
    >
      {highlight ? (
        <div
          style={{
            position: "absolute",
            left: "18%",
            top: "14%",
            width: "26%",
            height: "26%",
            borderRadius: "50%",
            background: highlight,
          }}
        />
      ) : null}
    </div>
  );
}
```

`Broom`, `SprayBottle` and `Bucket` follow the same shape: a positioned wrapper prop `style`, plus colour props for the parts that vary between slides. Read these blocks from the reference file:

- **Broom** — the `width:96px; height:290px` group (gold handle, coloured band, straw head with its double `background-image`). Colour of the band varies: `#B7212A` on slides 1, 2 and 4; `#0B4A2B` on slide 3. Slide 3 also swaps the solid straw head for four individual bristle divs.
- **SprayBottle** — the `width:80px; height:132px` group (nozzle, trigger, body gradient, label, three mist dots). Body gradient is red on slides 1 and 4, green on slides 2 and 3.
- **Bucket** — the `width:76px; height:104px` group (handle arc, tapered body, white band, rim).

Every ornament must be fully ported before this task is done — no `{/* … */}`
stand-in comments may remain in the file.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/kebersihan/_components/slides/decorations.tsx tests/kebersihan-slide-contract.test.mjs
git commit -m "feat: add carousel ornament components"
```

---

### Task 8: Photo slot component

**Files:**
- Create: `src/app/kebersihan/_components/photo-slot.tsx`
- Create: `src/lib/kebersihan/image-decode.ts`

**Interfaces:**
- Consumes: `SLOT_SIZES`, `SLOT_LABELS` (Task 4), `positionAxes` (Task 4)
- Produces:
  - `type SlotState = { src: string; imgW: number; imgH: number; zoom: number; posX: number; posY: number }`
  - `<PhotoSlot slot={SlotId} state={SlotState | null} />` — the render-side component used inside slides
  - `<PhotoSlotControls slot={SlotId} state onChange onPick />` — the form-side control used in the generator
  - `decodePhoto(file: File): Promise<{ src: string; imgW: number; imgH: number }>`

- [ ] **Step 1: Write the decode helper**

Create `src/lib/kebersihan/image-decode.ts`:

```ts
const MAX_EDGE = 2400;

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
```

- [ ] **Step 2: Write the slot components**

Create `src/app/kebersihan/_components/photo-slot.tsx`:

```tsx
"use client";

import type { SlotId } from "@/lib/kebersihan/slot-sizes.mjs";
import { SLOT_LABELS, SLOT_SIZES } from "@/lib/kebersihan/slot-sizes.mjs";
import { positionAxes } from "@/lib/kebersihan/crop-axes.mjs";

export type SlotState = {
  src: string;
  imgW: number;
  imgH: number;
  zoom: number;
  posX: number;
  posY: number;
};

export function PhotoSlot({
  slot,
  state,
}: {
  slot: SlotId;
  state: SlotState | null;
}) {
  if (!state) {
    return (
      <div
        data-slot={slot}
        style={{
          width: "100%",
          height: "100%",
          background: "rgba(11,74,43,0.08)",
        }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={state.src}
      alt=""
      data-slot={slot}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: `${state.posX}% ${state.posY}%`,
        transform: `scale(${state.zoom})`,
        display: "block",
      }}
    />
  );
}

export function PhotoSlotControls({
  slot,
  state,
  onPick,
  onChange,
}: {
  slot: SlotId;
  state: SlotState | null;
  onPick: (file: File) => void;
  onChange: (next: SlotState) => void;
}) {
  const box = SLOT_SIZES[slot];
  const axes = state
    ? positionAxes(state.imgW, state.imgH, box.width, box.height, state.zoom)
    : { x: false, y: false };

  return (
    <div className="rounded-lg border border-border p-4">
      <label className="block text-sm font-medium">{SLOT_LABELS[slot]}</label>
      <input
        type="file"
        accept="image/*"
        className="mt-2 block w-full text-sm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
        }}
      />
      {state ? (
        <div className="mt-3 space-y-3">
          <Slider
            label="Perbesar"
            min={1}
            max={2.5}
            step={0.01}
            value={state.zoom}
            onChange={(zoom) => onChange({ ...state, zoom })}
          />
          {axes.x ? (
            <Slider
              label="Geser kiri–kanan"
              min={0}
              max={100}
              step={1}
              value={state.posX}
              onChange={(posX) => onChange({ ...state, posX })}
            />
          ) : null}
          {axes.y ? (
            <Slider
              label="Geser atas–bawah"
              min={0}
              max={100}
              step={1}
              value={state.posY}
              onChange={(posY) => onChange({ ...state, posY })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/kebersihan/_components/photo-slot.tsx src/lib/kebersihan/image-decode.ts
git commit -m "feat: add kebersihan photo slot with slider crop"
```

---

### Task 9: Port slide 1 — Hero

**Files:**
- Create: `src/app/kebersihan/_components/slides/slide-hero.tsx`
- Test: extend `tests/kebersihan-slide-contract.test.mjs`

**Interfaces:**
- Consumes: `PhotoSlot`, `SlotState` (Task 8); `PromoBar` (Task 6); `Sparkle`, `Bubble`, `Broom`, `SprayBottle` (Task 7); tokens (Task 6)
- Produces: `SlideHero({ areaName: string, unitName: string, hero: SlotState | null })`

Port the block between `<!-- SLIDE 1 — HERO -->` and `<!-- SLIDE 2 — WIDE VIEW -->` in `docs/superpowers/reference/twibbon-lomba-kebersihan-v2.html`, applying the porting rules from Task 7. The component root is the `data-screen-label="Slide 1 Hero"` div; discard the two wrapper divs above it.

Slide 1 specifics worth care:
- The hero photo is the **first child** and sits behind everything; the gradient overlay `linear-gradient(178deg, …)` covers `inset: 0`.
- The promo bar here is **58px tall** (slides 2–4 use 56px) — pass `height={58}`.
- The Arabic hadith uses `fontFamily: FONT_ARABIC`, `fontWeight: 700`, `fontSize: 42`, `lineHeight: 1.5`.
- `bangga menjaganya` uses `fontFamily: FONT_SERIF_ITALIC`, `fontStyle: "italic"`, `fontWeight: 600`, `fontSize: 104`.
- `areaName` renders at 44px/700 and `unitName` at 29px, inside the gold-rule row.

- [ ] **Step 1: Add the failing test**

Append to `tests/kebersihan-slide-contract.test.mjs`:

```js
const SLIDES = {
  "slide-hero.tsx": "SlideHero",
  "slide-wide.tsx": "SlideWide",
  "slide-detail.tsx": "SlideDetail",
  "slide-improvement.tsx": "SlideImprovement",
};

test("slide 1 renders a full-size canvas with the designed copy", () => {
  const hero = readFileSync(
    "src/app/kebersihan/_components/slides/slide-hero.tsx",
    "utf8"
  );
  assert.match(hero, /export function SlideHero/);
  assert.match(hero, /SLIDE_WIDTH/);
  assert.match(hero, /SLIDE_HEIGHT/);
  assert.match(hero, /BERSIH TEMPATNYA,/);
  assert.match(hero, /bangga menjaganya/);
  assert.match(hero, /LOMBA KEBERSIHAN NURUS SUNNAH 2026/);
  assert.match(hero, /HR\. Muslim no\. 328/);
  assert.match(hero, /@nurussunnah\.ig/);
  assert.match(hero, /FONT_ARABIC/);
  assert.match(hero, /height=\{58\}/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="slide 1 renders"`
Expected: FAIL — cannot read `slide-hero.tsx`

- [ ] **Step 3: Write the component**

Create `src/app/kebersihan/_components/slides/slide-hero.tsx`. This is the shape; fill the ornament and body sections by porting from the reference:

```tsx
import type { SlotState } from "../photo-slot";
import { PhotoSlot } from "../photo-slot";
import { PromoBar } from "./promo-bar";
import {
  COLORS,
  FONT_ARABIC,
  FONT_SERIF_ITALIC,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "./tokens";

export function SlideHero({
  areaName,
  unitName,
  hero,
}: {
  areaName: string;
  unitName: string;
  hero: SlotState | null;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        background: COLORS.green,
        overflow: "hidden",
      }}
    >
      <PhotoSlot slot="hero" state={hero} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(178deg, rgba(8,38,22,0.5) 0%, rgba(8,38,22,0) 20%, rgba(8,38,22,0) 40%, rgba(7,42,24,0.9) 76%, rgba(6,36,20,0.97) 100%)",
        }}
      />
      {/* header: logo plate + wordmark + rotated HUT-81 badge — port from reference */}
      <PromoBar height={58} />
      {/* ornaments: broom, spray bottle, three bubbles — port from reference */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "0 60px 104px",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* three sparkles — port from reference */}
        <div style={{ marginBottom: 24, maxWidth: 660 }}>
          <div
            style={{
              color: COLORS.cream,
              fontFamily: FONT_ARABIC,
              fontWeight: 700,
              fontSize: 42,
              lineHeight: 1.5,
              textShadow: "0 2px 10px rgba(0,0,0,0.4)",
            }}
          >
            الطُّهُورُ شَطْرُ الْإِيمَانِ
          </div>
          <div
            style={{
              color: "rgba(253,252,248,0.92)",
              fontSize: 24,
              fontStyle: "italic",
              marginTop: 4,
              textShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            “Kesucian (kebersihan) itu separuh dari iman.” — HR. Muslim no. 328
          </div>
        </div>
        {/* pill, headline, gold rule + area/unit, footer row — port from reference */}
      </div>
    </div>
  );
}
```

Replace every `{/* … port from reference */}` comment with the actual ported markup before moving on. None may remain.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/kebersihan/_components/slides/slide-hero.tsx tests/kebersihan-slide-contract.test.mjs
git commit -m "feat: port carousel slide 1 hero"
```

---

### Task 10: Port slides 2 and 3 — Wide View and Detail

Slide 3 mirrors slide 2 but is not a pure mirror: the kicker text, straw-head treatment, band colours and sparkle positions all differ. They stay two separate components so a future design revision is easy to trace.

**Files:**
- Create: `src/app/kebersihan/_components/slides/slide-wide.tsx`
- Create: `src/app/kebersihan/_components/slides/slide-detail.tsx`
- Test: extend `tests/kebersihan-slide-contract.test.mjs`

**Interfaces:**
- Produces: `SlideWide({ areaName: string, unitName: string, wide: SlotState | null })`, `SlideDetail({ areaName: string, unitName: string, detail: SlotState | null })`

Key differences to preserve exactly:

| | Slide 2 Wide | Slide 3 Detail |
|---|---|---|
| Photo frame radius | `300px 36px 36px 36px` | `36px 300px 36px 36px` |
| Card position | `left:36 right:150` | `left:150 right:36` |
| Card rotation | `rotate(-1deg)` | `rotate(1deg)` |
| Kicker | `CERDAS DALAM MENATA` | `TERTIB & AMANAH` |
| Headline | `Bersih • Rapi • ` + italic `nyaman` | `Detail yang ` + italic `kami jaga` |
| Bubbles | left side | right side |
| Ornament cluster | `right:24 bottom:150`, w220 | `left:10 bottom:150`, w200 |
| Handle / values row | handle right, values left | handle left, values right |
| Sparkles | right side | left side |

Both share: paper background (`PAPER_BACKGROUND` over `COLORS.cream`), `<SlideHeader />`, `<Bunting />`, photo frame `top:130 left:36 right:36 bottom:340` with `border: 3px solid rgba(201,162,75,0.65)`, the three confetti chips at `top:44 left:620`, `top:86 left:680`, `top:56 left:742`, and `<PromoBar />` at the default 56px.

- [ ] **Step 1: Add the failing test**

Append to `tests/kebersihan-slide-contract.test.mjs`:

```js
test("slide 2 and slide 3 keep their distinct framing and copy", () => {
  const wide = readFileSync(
    "src/app/kebersihan/_components/slides/slide-wide.tsx",
    "utf8"
  );
  const detail = readFileSync(
    "src/app/kebersihan/_components/slides/slide-detail.tsx",
    "utf8"
  );

  assert.match(wide, /export function SlideWide/);
  assert.match(wide, /CERDAS DALAM MENATA/);
  assert.match(wide, /300px 36px 36px 36px/);
  assert.match(wide, /rotate\(-1deg\)/);

  assert.match(detail, /export function SlideDetail/);
  assert.match(detail, /TERTIB & AMANAH/);
  assert.match(detail, /36px 300px 36px 36px/);
  assert.match(detail, /rotate\(1deg\)/);

  for (const source of [wide, detail]) {
    assert.match(source, /SlideHeader/);
    assert.match(source, /Bunting/);
    assert.match(source, /PromoBar/);
    assert.match(source, /PAPER_BACKGROUND/);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="slide 2 and slide 3"`
Expected: FAIL — cannot read `slide-wide.tsx`

- [ ] **Step 3: Write both components**

Port the block between `<!-- SLIDE 2 — WIDE VIEW -->` and `<!-- SLIDE 3 — DETAIL -->` into `slide-wide.tsx`, and the block between `<!-- SLIDE 3 — DETAIL -->` and `<!-- SLIDE 4 — SEBELUM & SESUDAH -->` into `slide-detail.tsx`. Root element for both:

```tsx
<div
  style={{
    position: "relative",
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    background: COLORS.cream,
    backgroundImage: PAPER_BACKGROUND,
    overflow: "hidden",
  }}
>
```

The card body for slide 2:

```tsx
<div
  style={{
    position: "absolute",
    left: 36,
    right: 150,
    bottom: 130,
    background: CARD_GRADIENT,
    borderRadius: 32,
    padding: "44px 52px",
    boxShadow: CARD_SHADOW,
    transform: "rotate(-1deg)",
  }}
>
  <div
    style={{
      color: COLORS.goldLight,
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: "0.2em",
      marginBottom: 12,
    }}
  >
    CERDAS DALAM MENATA
  </div>
  <div
    style={{
      color: COLORS.cream,
      fontSize: 62,
      fontWeight: 800,
      lineHeight: 1.05,
    }}
  >
    Bersih • Rapi •{" "}
    <span
      style={{
        fontFamily: FONT_SERIF_ITALIC,
        fontStyle: "italic",
        fontWeight: 600,
        color: COLORS.goldLight,
      }}
    >
      nyaman
    </span>
  </div>
  <div
    style={{
      color: "rgba(253,252,248,0.85)",
      fontSize: 27,
      fontWeight: 600,
      marginTop: 18,
    }}
  >
    {areaName} — {unitName}
  </div>
</div>
```

Slide 3's card is identical except `left: 150, right: 36`, `transform: "rotate(1deg)"`, kicker `TERTIB & AMANAH`, and headline `Detail yang ` + italic `kami jaga`.

Both files must be fully ported before this task is done — every bubble,
confetti chip, sparkle, broom, spray bottle and bucket from the reference is
present, and no `{/* … */}` stand-in comments remain.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/kebersihan/_components/slides/slide-wide.tsx src/app/kebersihan/_components/slides/slide-detail.tsx tests/kebersihan-slide-contract.test.mjs
git commit -m "feat: port carousel slides 2 and 3"
```

---

### Task 11: Port slide 4 — Improvement

**Files:**
- Create: `src/app/kebersihan/_components/slides/slide-improvement.tsx`
- Test: extend `tests/kebersihan-slide-contract.test.mjs`

**Interfaces:**
- Produces: `SlideImprovement({ areaName: string, unitName: string, before: SlotState | null, after: SlotState | null })`

Two overlapping rotated photo frames:

| Frame | Position | Size | Rotation | Border | z-index |
|---|---|---|---|---|---|
| `before` | `top:150 left:40` | 620×440 | `rotate(-2deg)` | `3px solid rgba(201,162,75,0.5)` | default |
| `after` | `top:510 left:300` | 740×450 | `rotate(1.5deg)` | `6px solid #C9A24B` | 1 |

Both have `borderRadius: 28` and `overflow: "hidden"`. The `SEBELUM` pill sits at `top:208 left:76` on `rgba(20,20,20,0.8)`; the `SESUDAH` pill at `top:538 left:334` on `COLORS.green`. Both pills are `fontSize: 23`, `fontWeight: 800`, `letterSpacing: "0.2em"`, `padding: "12px 26px"`, `borderRadius: 999`, `zIndex: 2`, and carry the same rotation as their photo.

The header on this slide uses `zIndex: 3` (not 2) — pass `<SlideHeader zIndex={3} />`.

- [ ] **Step 1: Add the failing test**

Append to `tests/kebersihan-slide-contract.test.mjs`:

```js
test("slide 4 shows before and after with their pills", () => {
  const slide = readFileSync(
    "src/app/kebersihan/_components/slides/slide-improvement.tsx",
    "utf8"
  );
  assert.match(slide, /export function SlideImprovement/);
  assert.match(slide, /SEBELUM/);
  assert.match(slide, /SESUDAH/);
  assert.match(slide, /rotate\(-2deg\)/);
  assert.match(slide, /rotate\(1\.5deg\)/);
  assert.match(slide, /Kami menjaga,/);
  assert.match(slide, /bukan hanya membersihkan/);
  assert.match(slide, /zIndex=\{3\}/);
  assert.match(slide, /slot="before"/);
  assert.match(slide, /slot="after"/);
});

test("every slide component is locked to 1080x1350", () => {
  for (const [file, name] of Object.entries(SLIDES)) {
    const source = readFileSync(
      `src/app/kebersihan/_components/slides/${file}`,
      "utf8"
    );
    assert.match(source, new RegExp(`export function ${name}`));
    assert.match(source, /width: SLIDE_WIDTH/);
    assert.match(source, /height: SLIDE_HEIGHT/);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="slide 4 shows"`
Expected: FAIL — cannot read `slide-improvement.tsx`

- [ ] **Step 3: Write the component**

Port the block after `<!-- SLIDE 4 — SEBELUM & SESUDAH -->`. The closing card:

```tsx
<div
  style={{
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 110,
    background: CARD_GRADIENT,
    borderRadius: 32,
    padding: "38px 52px",
    boxShadow: CARD_SHADOW,
  }}
>
  <div
    style={{
      color: COLORS.cream,
      fontSize: 48,
      fontWeight: 800,
      lineHeight: 1.12,
    }}
  >
    Kami menjaga,{" "}
    <span
      style={{
        fontFamily: FONT_SERIF_ITALIC,
        fontStyle: "italic",
        fontWeight: 600,
        color: COLORS.goldLight,
      }}
    >
      bukan hanya membersihkan
    </span>
  </div>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 24,
      marginTop: 20,
      borderTop: "1px solid rgba(253,252,248,0.25)",
      paddingTop: 18,
    }}
  >
    <div style={{ color: "rgba(253,252,248,0.85)", fontSize: 24, fontWeight: 600 }}>
      {areaName} — {unitName}
    </div>
    <div
      style={{
        color: COLORS.goldLight,
        fontSize: 22,
        fontWeight: 700,
        flex: "none",
      }}
    >
      @nurussunnah.ig
    </div>
  </div>
</div>
```

The ornament cluster at `left:36 top:600`, the two green-tinted bubbles, the
white bubbles at `top:580 right:90` and `top:636 right:150`, the three confetti
chips, and the five sparkles must all be ported. No `{/* … */}` stand-in
comments may remain.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/kebersihan/_components/slides/slide-improvement.tsx tests/kebersihan-slide-contract.test.mjs
git commit -m "feat: port carousel slide 4 improvement"
```

---

### Task 12: Rasterization and export actions

**Files:**
- Modify: `package.json` (add `modern-screenshot`)
- Create: `src/lib/kebersihan/rasterize.ts`
- Create: `src/app/kebersihan/_components/slide-stage.tsx`
- Create: `src/app/kebersihan/_components/export-actions.tsx`
- Create: `src/app/kebersihan/_components/in-app-browser-notice.tsx`

**Interfaces:**
- Consumes: `slideFileName` (Task 2), `instagramCaption` / `whatsappSubmission` (Task 3)
- Produces: `rasterizeSlide(node: HTMLElement): Promise<Blob>`, `<SlideStage>`, `<ExportActions>`, `<InAppBrowserNotice />`

- [ ] **Step 1: Install the dependency**

```bash
npm install modern-screenshot@4.7.0
```

- [ ] **Step 2: Write the rasterizer**

Create `src/lib/kebersihan/rasterize.ts`:

```ts
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
```

- [ ] **Step 3: Write the preview stage**

Create `src/app/kebersihan/_components/slide-stage.tsx`. The scale lives on an outer wrapper so the inner node stays 1080×1350 and can be handed to the rasterizer unchanged:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export function SlideStage({
  children,
  nodeRef,
}: {
  children: ReactNode;
  nodeRef: (node: HTMLDivElement | null) => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const element = outerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / 1080);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="w-full overflow-hidden">
      <div style={{ height: 1350 * scale }}>
        <div
          style={{
            width: 1080,
            height: 1350,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          ref={nodeRef}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write the in-app browser notice**

Create `src/app/kebersihan/_components/in-app-browser-notice.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

function isInAppBrowser(userAgent: string) {
  return /(FBAN|FBAV|Instagram|Line|WhatsApp|; wv\))/i.test(userAgent);
}

export function InAppBrowserNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isInAppBrowser(navigator.userAgent));
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-lg border border-warning bg-warning/10 p-4 text-sm">
      Anda membuka halaman ini dari dalam aplikasi. Agar tombol simpan dan bagikan
      berfungsi, ketuk menu <strong>⋮</strong> lalu pilih{" "}
      <strong>Buka di Chrome</strong> atau <strong>Buka di Safari</strong>.
    </div>
  );
}
```

- [ ] **Step 5: Write the export actions**

Create `src/app/kebersihan/_components/export-actions.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { slideFileName } from "@/lib/kebersihan/filenames.mjs";

export function ExportActions({
  blobs,
  unit,
  area,
  caption,
  whatsapp,
}: {
  blobs: Blob[];
  unit: string;
  area: string;
  caption: string;
  whatsapp: string;
}) {
  const [sharing, setSharing] = useState(false);

  const files = blobs.map(
    (blob, index) =>
      new File([blob], slideFileName({ unit, area, slide: index + 1 }), {
        type: "image/jpeg",
      })
  );

  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files });

  async function shareAll() {
    setSharing(true);
    try {
      await navigator.share({ files, title: "Lomba Kebersihan Nurus Sunnah 2026" });
    } catch {
      // The participant dismissed the share sheet; the download buttons remain.
    } finally {
      setSharing(false);
    }
  }

  function download(index: number) {
    const url = URL.createObjectURL(blobs[index]);
    const link = document.createElement("a");
    link.href = url;
    link.download = slideFileName({ unit, area, slide: index + 1 });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} tersalin.`);
    } catch {
      toast.error(`${label} gagal disalin. Blok teksnya lalu salin manual.`);
    }
  }

  return (
    <div className="space-y-4">
      {canShare ? (
        <button
          type="button"
          onClick={shareAll}
          disabled={sharing}
          className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground"
        >
          SIMPAN 4 SLIDE
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {blobs.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => download(index)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            Unduh Slide {index + 1}
          </button>
        ))}
      </div>

      <textarea
        readOnly
        value={caption}
        rows={14}
        className="w-full rounded-lg border border-border p-3 text-sm"
      />
      <button
        type="button"
        onClick={() => copy(caption, "Caption")}
        className="w-full rounded-lg border border-border px-4 py-2 font-medium"
      >
        COPY CAPTION
      </button>

      <textarea
        readOnly
        value={whatsapp}
        rows={10}
        className="w-full rounded-lg border border-border p-3 text-sm"
      />
      <button
        type="button"
        onClick={() => copy(whatsapp, "Teks WhatsApp")}
        className="w-full rounded-lg border border-border px-4 py-2 font-medium"
      >
        COPY TEKS WHATSAPP
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/kebersihan/rasterize.ts src/app/kebersihan/_components/slide-stage.tsx src/app/kebersihan/_components/export-actions.tsx src/app/kebersihan/_components/in-app-browser-notice.tsx
git commit -m "feat: rasterize carousel slides and export them client-side"
```

---

### Task 13: Assemble the page

**Files:**
- Create: `src/app/kebersihan/page.tsx`
- Create: `src/app/kebersihan/_components/generator-client.tsx`
- Create: `src/app/kebersihan/_components/area-form.tsx`
- Test: extend `tests/kebersihan-slide-contract.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 2–12

- [ ] **Step 1: Add the failing test**

Append to `tests/kebersihan-slide-contract.test.mjs`:

```js
test("the page never ships user photos anywhere", () => {
  const client = readFileSync(
    "src/app/kebersihan/_components/generator-client.tsx",
    "utf8"
  );
  assert.doesNotMatch(client, /\bfetch\(/);
  assert.doesNotMatch(client, /"use server"/);
  assert.match(client, /tidak diunggah ke server/);
});

test("the page loads the self-hosted carousel fonts", () => {
  const page = readFileSync("src/app/kebersihan/page.tsx", "utf8");
  assert.match(page, /kebersihanFontVariables/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="the page never ships"`
Expected: FAIL — cannot read `generator-client.tsx`

- [ ] **Step 3: Write the area form**

Create `src/app/kebersihan/_components/area-form.tsx` with a unit `<select>` populated from `UNIT_OPTIONS`, a free-text input shown only when the value equals `UNIT_OTHER`, an area name input, and a member list with **+ Tambah Anggota** and a remove button per row. Every label is Indonesian.

- [ ] **Step 4: Write the generator client**

Create `src/app/kebersihan/_components/generator-client.tsx` holding the state described in the spec, wiring: `<InAppBrowserNotice />`, `<AreaForm />`, five `<PhotoSlotControls />`, four `<SlideStage>` previews, a **BUAT CAROUSEL** button that calls `rasterizeSlide` on each slide node **sequentially**, and `<ExportActions />`.

State, slot handling and the generate loop — the parts where a mistake costs a
participant their photos or their phone's memory:

```tsx
"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { SlotId } from "@/lib/kebersihan/slot-sizes.mjs";
import { SLOT_IDS } from "@/lib/kebersihan/slot-sizes.mjs";
import { UNIT_OTHER } from "@/lib/kebersihan/units.mjs";
import { instagramCaption, whatsappSubmission } from "@/lib/kebersihan/caption.mjs";
import { decodePhoto } from "@/lib/kebersihan/image-decode";
import { rasterizeSlide } from "@/lib/kebersihan/rasterize";
import type { SlotState } from "./photo-slot";

type Slots = Partial<Record<SlotId, SlotState>>;

export function GeneratorClient() {
  const [unit, setUnit] = useState("");
  const [unitOther, setUnitOther] = useState("");
  const [area, setArea] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  const [slots, setSlots] = useState<Slots>({});
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [busy, setBusy] = useState(false);

  const slideNodes = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);

  const resolvedUnit = unit === UNIT_OTHER ? unitOther.trim() : unit;
  const cleanMembers = members.map((name) => name.trim()).filter(Boolean);
  const ready =
    Boolean(resolvedUnit) &&
    Boolean(area.trim()) &&
    cleanMembers.length > 0 &&
    SLOT_IDS.every((id) => slots[id]);

  async function pickPhoto(id: SlotId, file: File) {
    try {
      const decoded = await decodePhoto(file);
      setSlots((current) => {
        const previous = current[id];
        if (previous) URL.revokeObjectURL(previous.src);
        return {
          ...current,
          [id]: { ...decoded, zoom: 1, posX: 50, posY: 50 },
        };
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Foto gagal dibaca.");
    }
  }

  async function generate() {
    setBusy(true);
    setBlobs([]);
    try {
      const results: Blob[] = [];
      // Sequential on purpose: four 1080x1350 rasterizations in parallel will
      // exhaust memory on mid-range phones.
      for (const node of slideNodes.current) {
        if (!node) throw new Error("Slide belum siap. Coba lagi.");
        results.push(await rasterizeSlide(node));
      }
      setBlobs(results);
      toast.success("4 slide siap diunduh.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat slide. Coba lagi."
      );
    } finally {
      setBusy(false);
    }
  }

  const caption = instagramCaption({
    unit: resolvedUnit,
    area: area.trim(),
    members: cleanMembers,
  });
  const whatsapp = whatsappSubmission({
    unit: resolvedUnit,
    area: area.trim(),
    members: cleanMembers,
    link: "",
  });

  // …render sections 1–7 here…
}
```

Remaining requirements for the render body:

- The **BUAT CAROUSEL** button uses `disabled={!ready || busy}`.
- Each `<SlideStage nodeRef={(node) => { slideNodes.current[i] = node; }}>` wraps
  one slide component, in order: hero, wide, detail, improvement.
- When `blobs.length === 4`, render `<ExportActions blobs={blobs} unit={resolvedUnit} area={area.trim()} caption={caption} whatsapp={whatsapp} />`.
- After a failure the button stays enabled so it doubles as **Coba Lagi**.
- The photo section carries the copy `Foto diproses di HP Anda dan tidak diunggah ke server.`
- Sections 1, 2 and 7 from spec §11 (Hero, Petunjuk, Instruksi akhir) are static markup.

- [ ] **Step 5: Write the page shell**

Create `src/app/kebersihan/page.tsx`:

```tsx
import type { Metadata } from "next";
import { kebersihanFontVariables } from "./kebersihan-fonts";
import { GeneratorClient } from "./_components/generator-client";

export const metadata: Metadata = {
  title: "Generator Carousel Lomba Kebersihan 2026",
  description:
    "Buat 4 slide carousel Instagram Lomba Kebersihan Yayasan Islam Nurus Sunnah 2026 langsung dari HP Anda.",
};

export default function KebersihanPage() {
  return (
    <main className={`${kebersihanFontVariables} min-h-screen bg-background`}>
      <GeneratorClient />
    </main>
  );
}
```

The page also renders the Hero, Petunjuk (Siapkan Foto → Upload → Download → Posting), and Instruksi Akhir sections described in spec section 11.

- [ ] **Step 6: Run tests, typecheck and build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add src/app/kebersihan tests/kebersihan-slide-contract.test.mjs
git commit -m "feat: assemble kebersihan carousel generator page"
```

---

### Task 14: Visual and device verification

Automation does not cover rendered pixels. This task is manual and **must not be skipped** — the largest remaining risk is iOS Safari rasterization.

**Files:** none

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open `http://localhost:3000/kebersihan`

- [ ] **Step 2: Compare against the design**

Open `docs/superpowers/reference/twibbon-lomba-kebersihan-v2.html` beside the preview and check each slide for colour, rotation, ornament position, and card placement.

- [ ] **Step 3: Check typography**

- The hadith renders in Amiri with its harakat intact
- `bangga menjaganya`, `nyaman`, `kami jaga` and `bukan hanya membersihkan` render in Lora italic, not upright
- Everything else renders in Plus Jakarta Sans, not a system fallback

- [ ] **Step 4: Check the export, not just the preview**

Generate all four slides and open the downloaded JPEGs. Confirm the logo and HUT-81 mark appear **in the exported files** — a preview that looks right while the export loses images is the classic `foreignObject` failure.

- [ ] **Step 5: Test on real phones**

Run the full flow on one Android and one iPhone. Confirm slides generate, the share sheet offers all four images, and captions copy. This step is the one that decides whether the tool works on 15 August.

- [ ] **Step 6: Check long input**

Enter `Ruang Administrasi dan Pelayanan Umum Terpadu` as the area name and confirm no slide overflows its canvas.

- [ ] **Step 7: Confirm the route is public**

Open `/kebersihan` in a private window with no session; it must render rather than redirect to `/auth/login`.

- [ ] **Step 8: Commit any fixes**

```bash
git add -A
git commit -m "fix: address carousel visual verification findings"
```
