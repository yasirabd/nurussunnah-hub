import assert from "node:assert/strict";
import { File } from "node:buffer";
import test from "node:test";

import {
  applyPreparedLeaveEvidence,
  hasJpegSignature,
  requiresLeaveEvidence,
} from "../src/lib/leave-evidence.mjs";

test("leave evidence requirement matches category and duration rules", () => {
  assert.equal(requiresLeaveEvidence("Duka Cita (Kedukaan)", false), true);
  assert.equal(
    requiresLeaveEvidence("Acara Khusus (Wisuda/Pernikahan/Ibadah)", false),
    true
  );
  assert.equal(requiresLeaveEvidence("Administrasi Pribadi", false), true);
  assert.equal(requiresLeaveEvidence("Sakit", true), true);
  assert.equal(requiresLeaveEvidence("Sakit", false), false);
  assert.equal(requiresLeaveEvidence("Keperluan Keluarga", true), false);
});

test("prepared evidence replaces native files in FormData", async () => {
  const formData = new FormData();
  formData.set("bukti_ss_kepala_unit", new File(["native"], "native.png"));
  formData.set("bukti_izin", new File(["native"], "native.png"));
  const unitHeadFile = new File(["head"], "head.jpg", { type: "image/jpeg" });
  const leaveFile = new File(["leave"], "leave.jpg", { type: "image/jpeg" });

  applyPreparedLeaveEvidence(formData, {
    unitHeadFile,
    leaveFile,
    noEvidenceAck: false,
  });

  assert.equal(await formData.get("bukti_ss_kepala_unit").text(), "head");
  assert.equal(await formData.get("bukti_izin").text(), "leave");
});

test("no-evidence acknowledgement removes leave evidence only", async () => {
  const formData = new FormData();
  const unitHeadFile = new File(["head"], "head.jpg", { type: "image/jpeg" });
  const leaveFile = new File(["leave"], "leave.jpg", { type: "image/jpeg" });

  applyPreparedLeaveEvidence(formData, {
    unitHeadFile,
    leaveFile,
    noEvidenceAck: true,
  });

  assert.equal(await formData.get("bukti_ss_kepala_unit").text(), "head");
  assert.equal(formData.has("bukti_izin"), false);
});

test("JPEG validation checks the file signature instead of MIME only", () => {
  assert.equal(hasJpegSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), true);
  assert.equal(hasJpegSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), false);
  assert.equal(hasJpegSignature(new Uint8Array([0xff, 0xd8])), false);
});
