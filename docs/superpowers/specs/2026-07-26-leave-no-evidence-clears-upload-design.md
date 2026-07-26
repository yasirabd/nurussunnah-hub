# Leave No-Evidence Checkbox Clears Upload Design

## Goal

Ensure the leave request's `Saya menyatakan tidak ada bukti fisik` checkbox always results in an empty `Bukti Izin` submission.

## Root Cause

The checkbox is currently uncontrolled and has no change handler, so selecting it does not clear an already selected file. The Server Action also reads and uploads `bukti_izin` independently of `no_evidence_ack`, allowing stale file data to be stored.

## UI Behavior

- Track the no-evidence checkbox as controlled React state.
- When checked, immediately clear `leaveEvidenceRef.current.value` and clear any previous upload-preparation message.
- Disable the `Bukti Izin` input while the checkbox remains checked.
- When unchecked, re-enable the input but do not restore the previously selected file.
- Keep the checkbox available only for leave categories where evidence is optional.
- If a category requires evidence, the file input remains enabled and required regardless of stale checkbox state.

## Server Protection

Read `no_evidence_ack` once before calling the RPC. Pass that value to `submit_leave_request`. When it is true, treat `bukti_izin` as an empty file list even if multipart form data contains stale files. The separate `bukti_ss_kepala_unit` upload is unaffected.

## Error Handling

Clearing the file is a local synchronous action and does not require an error state. Server-side filtering is authoritative and prevents an acknowledged no-evidence request from uploading evidence.

## Testing

- Add source-level regression coverage for the controlled checkbox, clear handler, and disabled file input.
- Add coverage confirming the Server Action uses `noEvidenceAck` to suppress evidence files.
- Run TypeScript, the full test suite, and the Cloudflare build.

## Non-Goals

- Changing which leave categories require evidence.
- Clearing the mandatory head-unit approval screenshot.
- Changing Google Drive folder structure or database schema.
