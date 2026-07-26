# Leave Request Camera Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the attendance-correction camera compression behavior to both leave-request upload fields through one reusable browser utility.

**Architecture:** Extract DOM-dependent image decoding, resizing, JPEG conversion, `FileList` replacement, and size calculation into `src/lib/evidence-upload-client.ts`. Refactor the correction form to consume it, then integrate both leave form inputs with a combined 10 MB limit and shared preparation state.

**Tech Stack:** Next.js 16 Server Actions, React 19, TypeScript, browser Canvas/File/DataTransfer APIs, Node test runner.

---

### Task 1: Shared Browser Upload Utility

**Files:**
- Create: `src/lib/evidence-upload-client.ts`
- Modify: `tests/attendance-correction-upload.test.mjs`

- [ ] **Step 1: Write the failing integration-source test**

Extend `tests/attendance-correction-upload.test.mjs` with source assertions that require a shared client utility and both forms to import it:

```js
test("attendance correction and leave request share browser image preparation", () => {
  const correctionForm = readFileSync(
    "src/app/dashboard/attendance-corrections/_components/correction-form.tsx",
    "utf8"
  );
  const leaveForm = readFileSync(
    "src/app/dashboard/leave-requests/_components/leave-request-form.tsx",
    "utf8"
  );
  const clientUtility = readFileSync("src/lib/evidence-upload-client.ts", "utf8");

  assert.match(clientUtility, /export async function prepareEvidenceFiles/);
  assert.match(clientUtility, /export function replaceInputFiles/);
  assert.match(clientUtility, /export function totalFileBytes/);
  assert.match(correctionForm, /from "@\/lib\/evidence-upload-client"/);
  assert.match(leaveForm, /from "@\/lib\/evidence-upload-client"/);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: FAIL because `src/lib/evidence-upload-client.ts` does not exist and the forms do not import it.

- [ ] **Step 3: Implement the shared utility**

Create `src/lib/evidence-upload-client.ts` with these exports:

```ts
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
```

- [ ] **Step 4: Run TypeScript to validate the utility**

Run: `npx tsc --noEmit`

Expected: PASS with exit code 0.

- [ ] **Step 5: Commit the utility and failing integration expectation**

```bash
git add src/lib/evidence-upload-client.ts tests/attendance-correction-upload.test.mjs
git commit -m "refactor: share evidence image preparation"
```

### Task 2: Refactor Attendance Correction to Shared Utility

**Files:**
- Modify: `src/app/dashboard/attendance-corrections/_components/correction-form.tsx`
- Test: `tests/attendance-correction-upload.test.mjs`

- [ ] **Step 1: Remove local browser image helpers**

Delete `decodeImage` and `optimizeEvidenceImage` from the correction form. Replace the existing upload imports with:

```ts
import { EVIDENCE_MAX_TOTAL_BYTES } from "@/lib/attendance-correction-upload.mjs";
import {
  prepareEvidenceFiles,
  replaceInputFiles,
  totalFileBytes,
} from "@/lib/evidence-upload-client";
```

- [ ] **Step 2: Update the preparation handler**

Replace the local mapping and `DataTransfer` code inside `prepareEvidence` with:

```ts
const prepared = await prepareEvidenceFiles(selectedFiles);
if (totalFileBytes(prepared.files) > EVIDENCE_MAX_TOTAL_BYTES) {
  throw new Error("Total bukti terlalu besar. Maksimal 10 MB setelah foto dikompresi.");
}
replaceInputFiles(input, prepared.files);
setEvidenceMessage(
  prepared.wasOptimized
    ? "Foto kamera sudah diperkecil dan siap diupload."
    : "Bukti siap diupload."
);
```

- [ ] **Step 3: Run the targeted test and confirm the correction form passes**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: The shared-utility source assertion still fails only because the leave form has not yet imported the utility; existing image sizing tests pass.

- [ ] **Step 4: Commit the correction form refactor**

```bash
git add src/app/dashboard/attendance-corrections/_components/correction-form.tsx
git commit -m "refactor: use shared evidence preparation"
```

### Task 3: Integrate Both Leave Request Inputs

**Files:**
- Modify: `src/app/dashboard/leave-requests/_components/leave-request-form.tsx`
- Modify: `tests/attendance-correction-upload.test.mjs`

- [ ] **Step 1: Add refs, state, and shared utility imports**

Change the React import and add utility imports:

```ts
import { useRef, useState } from "react";
import { EVIDENCE_MAX_TOTAL_BYTES } from "@/lib/attendance-correction-upload.mjs";
import {
  prepareEvidenceFiles,
  replaceInputFiles,
  totalFileBytes,
} from "@/lib/evidence-upload-client";
```

Inside `LeaveRequestForm`, add:

```ts
const unitHeadEvidenceRef = useRef<HTMLInputElement>(null);
const leaveEvidenceRef = useRef<HTMLInputElement>(null);
const [isPreparingEvidence, setIsPreparingEvidence] = useState(false);
const [evidenceMessage, setEvidenceMessage] = useState("");
```

- [ ] **Step 2: Add one handler for both inputs**

Add this handler inside the component:

```ts
async function prepareLeaveEvidence(event: React.ChangeEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const selectedFiles = Array.from(input.files ?? []);
  if (!selectedFiles.length) {
    setEvidenceMessage("");
    return;
  }

  setIsPreparingEvidence(true);
  setEvidenceMessage("Menyiapkan foto untuk upload...");
  try {
    const prepared = await prepareEvidenceFiles(selectedFiles);
    const otherInput =
      input.name === "bukti_izin" ? unitHeadEvidenceRef.current : leaveEvidenceRef.current;
    const otherFiles = Array.from(otherInput?.files ?? []);
    if (totalFileBytes([...prepared.files, ...otherFiles]) > EVIDENCE_MAX_TOTAL_BYTES) {
      throw new Error("Total seluruh bukti terlalu besar. Maksimal 10 MB setelah foto dikompresi.");
    }
    replaceInputFiles(input, prepared.files);
    setEvidenceMessage(
      prepared.wasOptimized
        ? "Foto kamera sudah diperkecil dan siap diupload."
        : "Bukti siap diupload."
    );
  } catch (error) {
    input.value = "";
    setEvidenceMessage(
      error instanceof Error ? error.message : "Bukti gagal disiapkan untuk upload."
    );
  } finally {
    setIsPreparingEvidence(false);
  }
}
```

- [ ] **Step 3: Wire both file inputs**

Add `ref`, `disabled`, and `onChange` to `bukti_ss_kepala_unit`:

```tsx
<Input
  ref={unitHeadEvidenceRef}
  id="bukti_ss_kepala_unit"
  name="bukti_ss_kepala_unit"
  type="file"
  accept="image/*"
  required
  disabled={isPreparingEvidence}
  onChange={prepareLeaveEvidence}
/>
```

Add the same behavior to `bukti_izin`:

```tsx
<Input
  ref={leaveEvidenceRef}
  id="bukti_izin"
  name="bukti_izin"
  type="file"
  accept="image/*,application/pdf"
  multiple
  required={evidenceRequired}
  disabled={isPreparingEvidence}
  onChange={prepareLeaveEvidence}
/>
```

Render the shared `evidenceMessage` with `aria-live="polite"`, and disable submit with `disabled={blocked || isPreparingEvidence}`.

- [ ] **Step 4: Strengthen regression assertions**

Extend the source test with:

```js
assert.match(leaveForm, /name="bukti_ss_kepala_unit"[\s\S]*onChange=\{prepareLeaveEvidence\}/);
assert.match(leaveForm, /name="bukti_izin"[\s\S]*onChange=\{prepareLeaveEvidence\}/);
assert.match(leaveForm, /blocked \|\| isPreparingEvidence/);
```

- [ ] **Step 5: Run targeted tests and confirm GREEN**

Run: `node --test tests/attendance-correction-upload.test.mjs`

Expected: All upload tests pass.

- [ ] **Step 6: Commit the leave form integration**

```bash
git add src/app/dashboard/leave-requests/_components/leave-request-form.tsx tests/attendance-correction-upload.test.mjs
git commit -m "fix: prepare leave request camera uploads"
```

### Task 4: Full Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: exit code 0 with no diagnostics.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 3: Run the Cloudflare build**

Run: `npm run build:cloudflare`

Expected: exit code 0 and refreshed `.open-next` artifacts.

- [ ] **Step 4: Confirm the body limit reached the Cloudflare artifact**

Run:

```powershell
Select-String -Path '.open-next\server-functions\default\.next\required-server-files.json' -Pattern 'bodySizeLimit|12mb' -Context 0,2
```

Expected: the artifact contains `"bodySizeLimit": "12mb"`.

- [ ] **Step 5: Check the final diff**

Run: `git diff --check`

Expected: exit code 0 with no whitespace errors.
