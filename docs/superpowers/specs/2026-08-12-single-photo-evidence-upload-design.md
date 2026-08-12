# Single-Photo Evidence Upload Design

## Goal

Make attendance-correction and employee-leave submissions more reliable on slow connections by limiting every evidence input to one compressed image. PDF and multi-file submissions are no longer supported.

## Scope

- Attendance Correction: `Bukti Pendukung` accepts at most one image.
- Employee Leave: `Bukti Screenshot Izin Kepala Unit` accepts at most one image.
- Employee Leave: `Bukti Izin` accepts at most one image.
- Existing evidence already stored in Google Drive remains unchanged and readable.
- Review, approval, recap, and historical attachment displays remain unchanged.

## Client Behavior

Each file input uses `accept="image/*"` without `multiple`. The existing browser preparation flow continues to resize and convert large camera images to JPEG before submission. The UI states that each input accepts one photo with a maximum prepared size of 5 MB.

Selecting a replacement photo replaces the previous selection. While preparation or submission is running, the relevant controls remain disabled to reduce accidental repeated submissions. Existing conditional rules remain intact: the unit-head screenshot stays required after approval is selected, and leave evidence follows its current category-dependent requirement and no-evidence acknowledgement.

Browser restrictions are usability aids only. Server validation remains authoritative.

## Server Validation

Both Server Actions validate evidence before creating the database request or uploading anything to Google Drive:

- reject more than one non-empty file for any evidence field;
- reject non-image MIME types, including PDF;
- reject a prepared image larger than 5 MB;
- return an Indonesian validation message on the submit tab.

The attendance-correction Server Action gains the same per-file size and MIME validation already used by employee leave. The employee-leave action validates the screenshot and leave-evidence fields independently.

## Submission Flow and Errors

The existing database-first, Drive-second flow remains in this focused change. If Drive upload fails after the database record is created, the user continues to receive the existing message explaining that the request was saved but its evidence failed to upload. This avoids falsely telling users that their whole request was lost.

Reducing each field to one compressed image keeps the request below the configured Server Action body limit in normal use and shortens Drive upload time. Full offline retry and database idempotency are intentionally outside this change and can be addressed separately if failures continue after deployment.

## Tests

Automated regression tests will verify:

- all three evidence inputs accept images only and omit `multiple`;
- the form copy says one photo and 5 MB;
- both Server Actions reject multiple files;
- both Server Actions reject PDF or other non-image files;
- validation happens before the database RPC and Google Drive upload;
- existing image preparation, conditional evidence, and no-evidence behavior remain covered.

## Success Criteria

Users can select only one photo per evidence field, PDF cannot be submitted through either form, oversized or manipulated submissions receive a clear validation error, and the existing test suite and production build pass.
