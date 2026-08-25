const REQUIRED_LEAVE_EVIDENCE_CATEGORIES = new Set([
  "Duka Cita (Kedukaan)",
  "Acara Khusus (Wisuda/Pernikahan/Ibadah)",
  "Administrasi Pribadi",
]);

export function requiresLeaveEvidence(category, multiDay) {
  return (
    REQUIRED_LEAVE_EVIDENCE_CATEGORIES.has(category) ||
    (category === "Sakit" && multiDay)
  );
}

export function applyPreparedLeaveEvidence(
  formData,
  { unitHeadFile, leaveFile, noEvidenceAck }
) {
  formData.delete("bukti_ss_kepala_unit");
  if (unitHeadFile) {
    formData.set("bukti_ss_kepala_unit", unitHeadFile);
  }

  formData.delete("bukti_izin");
  if (!noEvidenceAck && leaveFile) {
    formData.set("bukti_izin", leaveFile);
  }
}

export function hasJpegSignature(bytes) {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}
