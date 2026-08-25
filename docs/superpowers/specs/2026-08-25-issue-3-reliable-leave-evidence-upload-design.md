# Reliable Evidence Upload Design

## Goal

Make employee leave and attendance-correction evidence submission reliable on mobile gallery uploads, especially browsers where asynchronously replacing a native file input through `DataTransfer` is unreliable.

## Scope

- Employee Leave: `Bukti Screenshot Izin Kepala Unit` and `Bukti Izin` use prepared files stored by the React form rather than relying on the browser to retain a replaced `input.files` list.
- Attendance Correction: `Bukti Pendukung` uses the same prepared-file submission path.
- Employee Leave: the optional no-evidence acknowledgement removes only `Bukti Izin`; the required unit-head screenshot remains unchanged.
- Both forms attempt to decode JPEG, PNG, WebP, GIF, BMP, AVIF, HEIC, and HEIF sources and convert every browser-decodable image to JPEG.
- When the browser cannot decode HEIC, HEIF, or AVIF, the original file may be submitted if it is at most 5 MB and its file signature is valid.
- Other undecodable or unsupported formats receive an Indonesian client message asking the user to choose or convert the photo.
- No HEIC/HEIF JavaScript or WebAssembly decoder is added because its bundle and memory cost is risky on older mobile devices.
- Both Server Actions validate the allowed MIME type and actual file signature before persisting a request.
- Attachment metadata insertion failures are handled as upload failures instead of being silently ignored.
- Registration retains its current behavior and is outside this issue.
- No database migration, deployment, or production-data operation is included.

## Root Cause and Reliability Boundaries

The current client prepares an image asynchronously and then assigns a synthetic `FileList` to the native input using `DataTransfer`. The Server Action receives only the native form field, so a browser that rejects or loses that assignment can submit no prepared file or an unexpected original file. Mobile gallery formats add another failure mode: `accept="image/*"` permits formats that the browser canvas pipeline may not decode consistently.

The current Server Action also awaits the Supabase attachment insert without checking its returned error. A Drive upload can therefore complete while the attachment is missing from application history, matching the visible symptom that the photo was not uploaded.

The fix makes the prepared `File` held by React the source of truth at submission time, detects unsupported formats during browser decoding before submission, and treats attachment metadata persistence as required work.

## Client Design

The leave form keeps one prepared file for each evidence field in refs or state. The change handler:

1. reads the selected gallery file;
2. verifies that the file declares an image MIME type;
3. asks the browser image decoder to read it and converts the decoded image to JPEG;
4. applies the existing dimension and size limits to the JPEG output;
5. stores the resulting `File` for the relevant field;
6. shows the existing ready/optimized status message.

Each form uses a client action wrapper. Immediately before calling its existing Server Action, it replaces each evidence entry in the submitted `FormData` with the prepared file held by the form. This avoids depending on mutation of `input.files` while preserving the existing server-action and redirect flow.

Checking the no-evidence acknowledgement clears the prepared `Bukti Izin`, clears its native input, and omits that file from `FormData`. It does not clear the unit-head screenshot. Changing to an evidence-required category resets an acknowledgement that is no longer valid.

The file inputs continue to advertise `image/*`. The UI explains that photos are normally converted to JPEG, while HEIC/HEIF/AVIF may be uploaded in their original format. The existing one-photo, 5 MB limit remains.

## Server Design

The leave and attendance-correction actions invoke the shared evidence validator with an explicit safe MIME allowlist. Signature validation recognizes JPEG, PNG, WebP, GIF, BMP, AVIF, HEIC, and HEIF, while Server Actions normally receive JPEG plus the allowed original HEIC/HEIF/AVIF fallbacks. Unsupported, mismatched, or empty manipulated submissions receive a clear validation message before either RPC is called.

After Drive uploads complete, both actions check their attachment metadata insert result. A returned Supabase error enters the existing partial-success path, which tells the user that the request was saved but its evidence failed and must not be resubmitted.

User-facing errors remain concise and do not expose raw credentials or sensitive configuration. Existing database-first behavior remains unchanged because transaction redesign and idempotent upload recovery are outside this issue.

## Testing

Automated regression tests will verify that:

- the leave form stores prepared files separately for the two evidence fields;
- the attendance-correction form stores and submits its prepared evidence independently of the native input;
- submission writes those prepared files into `FormData` before invoking the Server Action;
- the no-evidence acknowledgement removes only leave evidence;
- every supported browser-decodable source is converted to JPEG;
- valid HEIC/HEIF/AVIF files can fall back to original upload when decoding is unavailable;
- unsupported, corrupt, and MIME/signature-mismatched files are rejected clearly;
- the client inputs continue to allow gallery image selection;
- both Server Actions enforce the same MIME/signature contract;
- attachment metadata insert errors cannot be silently ignored in either form;
- all existing upload, no-evidence, and size-limit tests continue to pass.

## Success Criteria

A supported photo selected from a mobile gallery is submitted from the prepared-file source of truth in either form, independent of `DataTransfer` behavior. Browser-decodable formats become JPEG; valid HEIC/HEIF/AVIF can be stored in Google Drive without conversion when necessary. Selecting no physical evidence submits without `Bukti Izin` while retaining the required unit-head screenshot. A failed attachment metadata insert produces the existing partial-success warning rather than a false success.
