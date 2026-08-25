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
  assert.match(clientUtility, /convertToJpeg/);
  assert.match(
    clientUtility,
    /convertToJpeg\s*\|\|\s*shouldOptimizeEvidenceFile/
  );
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
  assert.match(
    clientUtility,
    /Pilih atau konversi foto ke JPG, PNG, atau WebP/
  );
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
  assert.match(leaveForm, /leavePreparedEvidenceRef\.current = null/);
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
    /evidence = noEvidenceAck\s*\? \[\]\s*:\s*validateSingleEvidenceImage\(formData, "bukti_izin"/
  );
});

test("leave submission uses prepared files instead of DataTransfer mutation", () => {
  const leaveForm = readFileSync(
    "src/app/dashboard/leave-requests/_components/leave-request-form.tsx",
    "utf8"
  );

  assert.match(leaveForm, /unitHeadPreparedEvidenceRef/);
  assert.match(leaveForm, /leavePreparedEvidenceRef/);
  assert.match(leaveForm, /convertToJpeg:\s*true/);
  assert.match(leaveForm, /function submitPreparedLeaveRequest/);
  assert.match(leaveForm, /applyPreparedLeaveEvidence\(formData/);
  assert.match(leaveForm, /<form action=\{submitPreparedLeaveRequest\}/);
  assert.doesNotMatch(leaveForm, /replaceInputFiles/);
});

test("attendance correction and leave evidence inputs accept one image only", () => {
  const correctionForm = readFileSync(
    "src/app/dashboard/attendance-corrections/_components/correction-form.tsx",
    "utf8"
  );
  const leaveForm = readFileSync(
    "src/app/dashboard/leave-requests/_components/leave-request-form.tsx",
    "utf8"
  );
  const inputFor = (source, name) =>
    source
      .match(/<Input[\s\S]*?\/>/g)
      ?.find((input) => input.includes(`name="${name}"`));

  for (const [source, name] of [
    [correctionForm, "bukti"],
    [leaveForm, "bukti_ss_kepala_unit"],
    [leaveForm, "bukti_izin"],
  ]) {
    const input = inputFor(source, name);
    assert.ok(input, `${name} input must exist`);
    assert.match(input, /accept="image\/\*"/);
    assert.doesNotMatch(input, /\bmultiple\b/);
  }

  assert.match(correctionForm, /Maksimal 1 foto, 5 MB/);
  assert.match(leaveForm, /Maksimal 1 foto, 5 MB/g);
});

test("server validates each evidence field before creating a request", () => {
  const serverUtility = readFileSync("src/lib/evidence-upload-server.ts", "utf8");
  const correctionAction = readFileSync(
    "src/app/dashboard/attendance-corrections/actions.ts",
    "utf8"
  );
  const leaveAction = readFileSync(
    "src/app/dashboard/leave-requests/actions.ts",
    "utf8"
  );

  assert.match(serverUtility, /export function validateSingleEvidenceImage/);
  assert.match(serverUtility, /files\.length > 1/);
  assert.match(serverUtility, /file\.type\.startsWith\("image\/"\)/);
  assert.match(serverUtility, /EVIDENCE_MAX_FILE_BYTES/);

  assert.match(
    correctionAction,
    /validateSingleEvidenceImage\(formData, "bukti", "Bukti pendukung"\)/
  );
  assert.ok(
    correctionAction.indexOf("validateSingleEvidenceImage") <
      correctionAction.indexOf('supabase.rpc("submit_attendance_correction"')
  );

  assert.match(
    leaveAction,
    /validateSingleEvidenceImage\(\s*formData,\s*"bukti_ss_kepala_unit",\s*"Bukti screenshot izin kepala unit",[\s\S]*?required:\s*true[\s\S]*?allowedMimeTypes:\s*\["image\/jpeg"\][\s\S]*?\)/
  );
  assert.match(
    leaveAction,
    /validateSingleEvidenceImage\(formData, "bukti_izin", "Bukti izin", \{[\s\S]*?allowedMimeTypes:\s*\["image\/jpeg"\][\s\S]*?\}\)/
  );
  assert.match(leaveAction, /allowedMimeTypes:\s*\["image\/jpeg"\]/);
  assert.match(leaveAction, /required:\s*true/);
  assert.match(leaveAction, /requiresLeaveEvidence\(leaveCategory, multiDay\)/);
  assert.match(leaveAction, /if \(noEvidenceAck && evidenceRequired\)/);
  assert.match(leaveAction, /required:\s*evidenceRequired/);
  assert.match(leaveAction, /await validateJpegFileSignatures\(evidence/);
  assert.match(
    leaveAction,
    /await validateJpegFileSignatures\(\s*unitHeadSs/
  );
  assert.match(
    leaveAction,
    /const \{ error: attachmentError \} = await supabase[\s\S]*?leave_request_attachments[\s\S]*?if \(attachmentError\) throw/
  );
  assert.ok(
    leaveAction.indexOf("validateSingleEvidenceImage") <
      leaveAction.indexOf('supabase.rpc("submit_leave_request"')
  );
});
