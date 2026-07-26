# Leave Request Camera Upload Design

## Goal

Make direct camera uploads on the leave request form reliable on Cloudflare by applying the same browser-side image preparation used by attendance corrections.

## Scope

- Process both `bukti_ss_kepala_unit` and `bukti_izin` file inputs.
- Compress large image files before the Server Action request is submitted.
- Keep PDF files unchanged.
- Enforce a 10 MB combined prepared-file limit across both inputs.
- Disable submission while either input is being processed.
- Preserve the existing global 12 MB Server Action body limit.

## Architecture

Move browser image decoding, resizing, JPEG conversion, and `FileList` replacement into a reusable client utility. The attendance correction and leave request forms call the same utility so their upload behavior cannot drift.

The existing pure sizing rules remain in `src/lib/attendance-correction-upload.mjs` for Node test coverage. Browser-only operations live in a TypeScript client module that depends on DOM APIs.

## Data Flow

1. The user selects or captures one or more files.
2. Images larger than 1 MB are resized to fit within 1600 x 1600 pixels and encoded as JPEG at quality 0.82.
3. PDFs and small images pass through unchanged.
4. The prepared files replace the input's original `FileList`.
5. The form calculates the combined size of both leave-request inputs.
6. Submission remains disabled until preparation finishes and is rejected locally if the combined size exceeds 10 MB.
7. The prepared multipart request is sent to the existing Server Action and uploaded to Google Drive.

## Error Handling

- If an image cannot be decoded or compressed, clear the affected input and show an actionable browser-side message.
- If combined files exceed 10 MB, prevent submission and ask the user to reduce the files.
- Keep the existing server-side Drive upload error handling unchanged.

## Testing

- Retain tests for image-selection and resize rules.
- Add source-level regression coverage proving both leave-request inputs use the shared preparation handler.
- Verify TypeScript, the full Node test suite, and the Cloudflare build.

## Non-Goals

- Changing Google Drive folder structure or database attachment records.
- Compressing PDF files.
- Uploading directly from the browser to Google Drive.
