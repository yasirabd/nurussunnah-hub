# Leave Evidence 5 MB Design

## Goal

Ensure every uploaded leave-evidence file is at most 5 MB before submission. Oversized images are compressed automatically in the browser, while oversized PDFs are rejected with a clear message.

## Current Behavior and Root Cause

Both leave evidence inputs already use the shared browser image-preparation utility. However, the form only enforces a 10 MB combined limit, and image optimization uses one fixed resize/quality pass. Consequently, an individual file may still exceed 5 MB and reach the Server Action or Google Drive upload path.

## Design

Define a shared per-file limit of 5,000,000 bytes. Image preparation will preserve files already within the limit. Images above the limit will be encoded as JPEG using progressively smaller dimensions and/or lower quality until the result is below the limit. The highest-quality successful result is retained. If the browser cannot produce a result below the limit, the input is cleared and the user receives an error.

`Bukti Screenshot Izin Kepala Unit` and every file selected under `Bukti Izin` use the same preparation path. Each file is evaluated independently; the number of files does not change the per-file limit. PDFs are not converted or compressed. A PDF over 5 MB is rejected and the input is cleared.

The Server Action independently rejects any received evidence file above 5 MB before creating the leave request. This prevents bypassing client validation and avoids saving a request whose attachments cannot be uploaded under the declared rule.

## User Feedback

Both inputs state that each file is limited to 5 MB and that oversized photos are compressed automatically. Preparation feedback distinguishes a successfully compressed image from a file that was already ready. Errors identify the offending file and instruct the user to choose a smaller PDF when applicable.

## Testing

Unit tests cover the shared 5 MB constant, image compression attempts, per-file validation, and aspect-ratio resizing. Source-level integration tests confirm both leave inputs display the limit and use preparation. Server Action tests confirm validation occurs before the database RPC and Drive upload path.

