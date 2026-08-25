# Reliable Leave Evidence Upload Design

## Goal

Make employee leave evidence submission reliable on mobile gallery uploads, especially browsers where asynchronously replacing a native file input through `DataTransfer` is unreliable. Unsupported gallery formats must fail before submission with a clear message instead of surfacing as a generic server error.

## Scope

- Employee Leave: `Bukti Screenshot Izin Kepala Unit` and `Bukti Izin` use prepared files stored by the React form rather than relying on the browser to retain a replaced `input.files` list.
- Employee Leave: the optional no-evidence acknowledgement removes only `Bukti Izin`; the required unit-head screenshot remains unchanged.
- Shared evidence preparation explicitly supports JPEG, PNG, and WebP images.
- HEIC, HEIF, and other unsupported image formats receive an Indonesian client message asking the user to choose or convert the photo to JPG, PNG, or WebP.
- The Server Action enforces the same supported MIME types and reports validation failures on the submission tab.
- Attachment metadata insertion failures are handled as upload failures instead of being silently ignored.
- Attendance Correction and Registration retain their current behavior unless a shared validation test requires the same safe format contract.
- No database migration, deployment, or production-data operation is included.

## Root Cause and Reliability Boundaries

The current client prepares an image asynchronously and then assigns a synthetic `FileList` to the native input using `DataTransfer`. The Server Action receives only the native form field, so a browser that rejects or loses that assignment can submit no prepared file or an unexpected original file. Mobile gallery formats add another failure mode: `accept="image/*"` permits formats that the browser canvas pipeline may not decode consistently.

The current Server Action also awaits the Supabase attachment insert without checking its returned error. A Drive upload can therefore complete while the attachment is missing from application history, matching the visible symptom that the photo was not uploaded.

The fix makes the prepared `File` held by React the source of truth at submission time, rejects unsupported formats before expensive processing, and treats attachment metadata persistence as required work.

## Client Design

The leave form keeps one prepared file for each evidence field in refs or state. The change handler:

1. reads the selected gallery file;
2. validates that its MIME type is JPEG, PNG, or WebP;
3. prepares/compresses it with the existing size limit;
4. stores the resulting `File` for the relevant field;
5. shows the existing ready/optimized status message.

The form uses a client action wrapper. Immediately before calling the existing Server Action, it replaces each evidence entry in the submitted `FormData` with the prepared file held by the form. This avoids depending on mutation of `input.files` while preserving the existing server-action and redirect flow.

Checking the no-evidence acknowledgement clears the prepared `Bukti Izin`, clears its native input, and omits that file from `FormData`. It does not clear the unit-head screenshot. Changing to an evidence-required category resets an acknowledgement that is no longer valid.

The file inputs advertise `image/jpeg,image/png,image/webp`. The UI states the supported formats and keeps the one-photo, 5 MB limit.

## Server Design

The shared evidence validator accepts only JPEG, PNG, and WebP MIME types in addition to its current count and size checks. Unsupported or empty manipulated submissions receive a clear validation message before the leave RPC is called.

After Drive uploads complete, the leave action checks the result of inserting `leave_request_attachments`. A returned Supabase error is thrown into the existing partial-success path, which tells the user that the leave request was saved but its evidence failed and must not be resubmitted.

User-facing errors remain concise and do not expose raw credentials or sensitive configuration. Existing database-first behavior remains unchanged because transaction redesign and idempotent upload recovery are outside this issue.

## Testing

Automated regression tests will verify that:

- the leave form stores prepared files separately for the two evidence fields;
- submission writes those prepared files into `FormData` before invoking the Server Action;
- the no-evidence acknowledgement removes only leave evidence;
- JPEG, PNG, and WebP are supported while HEIC/HEIF are rejected clearly;
- the client inputs advertise only supported formats;
- server validation uses the same MIME contract;
- attachment metadata insert errors cannot be silently ignored;
- all existing upload, no-evidence, and size-limit tests continue to pass.

## Success Criteria

A supported photo selected from a mobile gallery is submitted from the prepared-file source of truth, independent of `DataTransfer` behavior. Unsupported gallery formats are stopped with an actionable message. Selecting no physical evidence submits without `Bukti Izin` while retaining the required unit-head screenshot. A failed attachment metadata insert produces the existing partial-success warning rather than a false success.
