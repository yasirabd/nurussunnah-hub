import assert from "node:assert/strict";
import { File } from "node:buffer";
import test from "node:test";

import {
  applyPreparedLeaveEvidence,
  requiresLeaveEvidence,
} from "../src/lib/leave-evidence.mjs";
import {
  applyPreparedEvidenceFile,
  detectEvidenceImageFormat,
  evidenceMimeTypeForFormat,
  evidenceFormatMatchesMimeType,
  isOriginalEvidenceFallbackFormat,
  isPreparedEvidenceMimeType,
  prepareOriginalEvidenceFallback,
} from "../src/lib/evidence-file.mjs";

test("prepared evidence replaces the browser-selected file", () => {
  const formData = new FormData();
  const original = new File(["original"], "original.png", { type: "image/png" });
  const prepared = new File(["prepared"], "prepared.jpg", { type: "image/jpeg" });

  formData.set("bukti", original);
  applyPreparedEvidenceFile(formData, "bukti", prepared);

  assert.equal(formData.getAll("bukti").length, 1);
  assert.equal(formData.get("bukti"), prepared);
});

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
  assert.equal(
    detectEvidenceImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
    "jpeg"
  );
  assert.equal(detectEvidenceImageFormat(new Uint8Array([0xff, 0xd8])), null);
});

test("safe evidence image formats are detected from signatures", () => {
  const ascii = (value) => Array.from(Buffer.from(value, "ascii"));
  const bmff = (brand) =>
    new Uint8Array([0, 0, 0, 24, ...ascii("ftyp"), ...ascii(brand)]);

  assert.equal(
    detectEvidenceImageFormat(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    ),
    "png"
  );
  assert.equal(
    detectEvidenceImageFormat(new Uint8Array([...ascii("GIF89a")])),
    "gif"
  );
  assert.equal(
    detectEvidenceImageFormat(
      new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")])
    ),
    "webp"
  );
  assert.equal(
    detectEvidenceImageFormat(new Uint8Array([...ascii("BM"), 0, 0])),
    "bmp"
  );
  assert.equal(detectEvidenceImageFormat(bmff("avif")), "avif");
  assert.equal(detectEvidenceImageFormat(bmff("heic")), "heic");
  assert.equal(detectEvidenceImageFormat(bmff("mif1")), "heif");
  assert.equal(detectEvidenceImageFormat(bmff("xxxx")), null);
});

test("only mobile formats may bypass browser conversion", () => {
  assert.equal(isOriginalEvidenceFallbackFormat("heic"), true);
  assert.equal(isOriginalEvidenceFallbackFormat("heif"), true);
  assert.equal(isOriginalEvidenceFallbackFormat("avif"), true);
  assert.equal(isOriginalEvidenceFallbackFormat("jpeg"), false);
  assert.equal(isOriginalEvidenceFallbackFormat("png"), false);
});

test("original mobile image fallback normalizes MIME type and extension", async () => {
  const heicBytes = new Uint8Array([
    0, 0, 0, 24, ...Buffer.from("ftyp", "ascii"), ...Buffer.from("heic", "ascii"),
  ]);
  const source = new File([heicBytes], "camera.bin", {
    type: "application/octet-stream",
    lastModified: 123,
  });

  const prepared = await prepareOriginalEvidenceFallback(source, 5_000_000);

  assert.equal(prepared?.name, "camera.heic");
  assert.equal(prepared?.type, "image/heic");
  assert.equal(prepared?.lastModified, 123);
});

test("original fallback rejects unsupported and oversized image data", async () => {
  const png = new File([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ], "photo.png", { type: "image/png" });
  assert.equal(await prepareOriginalEvidenceFallback(png, 5_000_000), null);

  const avifHeader = new Uint8Array([
    0, 0, 0, 24, ...Buffer.from("ftyp", "ascii"), ...Buffer.from("avif", "ascii"),
  ]);
  const oversized = new File([avifHeader, new Uint8Array(32)], "photo", {
    type: "image/avif",
  });
  await assert.rejects(
    prepareOriginalEvidenceFallback(oversized, 16),
    /format asli melebihi batas 5 MB/
  );
});

test("prepared evidence MIME types must match their detected format", () => {
  assert.equal(isPreparedEvidenceMimeType("image/jpeg"), true);
  assert.equal(isPreparedEvidenceMimeType("image/heic"), true);
  assert.equal(isPreparedEvidenceMimeType("image/heif-sequence"), true);
  assert.equal(isPreparedEvidenceMimeType("image/avif"), true);
  assert.equal(isPreparedEvidenceMimeType("image/png"), false);

  assert.equal(evidenceFormatMatchesMimeType("jpeg", "image/jpeg"), true);
  assert.equal(evidenceFormatMatchesMimeType("heic", "image/heic"), true);
  assert.equal(evidenceFormatMatchesMimeType("heif", "image/heif"), true);
  assert.equal(evidenceFormatMatchesMimeType("avif", "image/avif"), true);
  assert.equal(evidenceFormatMatchesMimeType("heic", "image/jpeg"), false);
  assert.equal(evidenceMimeTypeForFormat("heic"), "image/heic");
  assert.equal(evidenceMimeTypeForFormat("heif"), "image/heif");
  assert.equal(evidenceMimeTypeForFormat("avif"), "image/avif");
});
