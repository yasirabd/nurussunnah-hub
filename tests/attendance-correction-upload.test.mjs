import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  EVIDENCE_MAX_FILE_BYTES,
  evidenceCompressionAttempts,
  fitEvidenceImage,
  isEvidenceFileWithinLimit,
  shouldOptimizeEvidenceFile,
} from "../src/lib/attendance-correction-upload.mjs";

test("leave evidence uses a 5 MB per-file limit", () => {
  assert.equal(EVIDENCE_MAX_FILE_BYTES, 5_000_000);
  assert.equal(isEvidenceFileWithinLimit(5_000_000), true);
  assert.equal(isEvidenceFileWithinLimit(5_000_001), false);
});

test("image compression attempts preserve ratio and become progressively smaller", () => {
  const attempts = evidenceCompressionAttempts(4000, 3000);

  assert.ok(attempts.length >= 4);
  assert.deepEqual(attempts[0], { width: 2560, height: 1920, quality: 0.9 });
  assert.ok(attempts.at(-1).width < attempts[0].width);
  assert.ok(attempts.at(-1).quality < attempts[0].quality);
  for (const attempt of attempts) {
    assert.equal(attempt.width / attempt.height, 4 / 3);
  }
});

test("large camera images are selected for browser optimization", () => {
  assert.equal(shouldOptimizeEvidenceFile("image/jpeg", 2_500_000), true);
  assert.equal(shouldOptimizeEvidenceFile("image/jpeg", 500_000), false);
  assert.equal(shouldOptimizeEvidenceFile("application/pdf", 2_500_000), false);
});

test("camera images are resized without changing aspect ratio", () => {
  assert.deepEqual(fitEvidenceImage(4032, 3024), { width: 1600, height: 1200 });
  assert.deepEqual(fitEvidenceImage(3024, 4032), { width: 1200, height: 1600 });
  assert.deepEqual(fitEvidenceImage(1200, 900), { width: 1200, height: 900 });
});

test("server action body limit accommodates optimized camera uploads", () => {
  const config = readFileSync("next.config.ts", "utf8");
  assert.match(config, /serverActions\s*:\s*\{[\s\S]*bodySizeLimit\s*:\s*["']12mb["']/);
});

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
  assert.match(clientUtility, /evidenceCompressionAttempts/);
  assert.match(clientUtility, /EVIDENCE_MAX_FILE_BYTES/);
  assert.match(clientUtility, /isEvidenceFileWithinLimit\(blob\.size, maxFileBytes\)/);
  assert.match(clientUtility, /tidak dapat diperkecil hingga di bawah 5 MB/);
  assert.match(clientUtility, /for \(const file of files\)/);
  assert.doesNotMatch(clientUtility, /Promise\.all\(\s*files\.map/);
  assert.match(clientUtility, /export function replaceInputFiles/);
  assert.match(clientUtility, /export function totalFileBytes/);
  assert.match(correctionForm, /from "@\/lib\/evidence-upload-client"/);
  assert.match(leaveForm, /from "@\/lib\/evidence-upload-client"/);
  assert.match(
    leaveForm,
    /name="bukti_ss_kepala_unit"[\s\S]*?onChange=\{prepareLeaveEvidence\}/
  );
  assert.match(
    leaveForm,
    /name="bukti_izin"[\s\S]*?onChange=\{prepareLeaveEvidence\}/
  );
  assert.match(leaveForm, /blocked \|\| isPreparingEvidence/);
});

test("attendance correction note is optional", () => {
  const correctionForm = readFileSync(
    "src/app/dashboard/attendance-corrections/_components/correction-form.tsx",
    "utf8"
  );
  const reasonTextarea = correctionForm
    .match(/<Textarea[\s\S]*?\/>/g)
    ?.find((field) => field.includes('name="reason"'));

  assert.match(correctionForm, /Keterangan \(Opsional\)/);
  assert.ok(reasonTextarea, "reason textarea must exist");
  assert.match(reasonTextarea, /rows=\{4\}/);
  assert.doesNotMatch(reasonTextarea, /\brequired\b/);
});

test("no-evidence acknowledgement clears and disables leave evidence", () => {
  const leaveForm = readFileSync(
    "src/app/dashboard/leave-requests/_components/leave-request-form.tsx",
    "utf8"
  );
  const leaveAction = readFileSync(
    "src/app/dashboard/leave-requests/actions.ts",
    "utf8"
  );

  assert.match(
    leaveForm,
    /const \[noEvidenceAck, setNoEvidenceAck\] = useState\(false\)/
  );
  assert.match(leaveForm, /function handleNoEvidenceAck/);
  assert.match(leaveForm, /leaveEvidenceRef\.current\.value = ""/);
  assert.match(
    leaveForm,
    /disabled=\{isPreparingEvidence \|\| \(!evidenceRequired && noEvidenceAck\)\}/
  );
  assert.match(leaveForm, /checked=\{noEvidenceAck\}/);
  assert.match(
    leaveForm,
    /onChange=\{\(event\) => handleNoEvidenceAck\(event\.target\.checked\)\}/
  );
  assert.match(
    leaveAction,
    /const noEvidenceAck = text\(formData, "no_evidence_ack"\) === "on"/
  );
  assert.match(
    leaveAction,
    /const evidence = noEvidenceAck\s*\? \[\]\s*:\s*evidenceFiles\(formData, "bukti_izin"\)/
  );
});
