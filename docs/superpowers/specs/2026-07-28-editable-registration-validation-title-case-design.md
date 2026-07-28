# Editable Registration Validation and Full-Name Title Case

Date: 2026-07-28
Status: Approved for implementation planning

## Goal

Allow HRD and ADMIN users to correct registration data inside the registration review dialog before approving and creating an employee account. Normalize only the registrant's full name to Title Case.

## Scope

### Editable during validation

The validation form may edit all registration text, date, and selection fields used to create the employee record, including:

- Full name
- NIK
- Phone number
- Gender
- Marital status
- Birth place and birth date
- Last education and study program
- KTP and domicile addresses
- Facebook, Instagram, and Twitter/X values
- Placement unit
- Position
- Uniform size
- Emergency contact name, relationship, and phone number
- Registration note, when present
- Join date and employee status, which are already assigned during validation

### Read-only during validation

- Email
- Uploaded KTP document
- Uploaded formal photo

Replacing uploaded documents and changing the registration email are outside this change.

## User Experience

The existing review dialog becomes one integrated approval form. Existing registration values populate the editable controls, while the email and document links remain read-only.

When the reviewer leaves the Full Name input, the visible value is converted to Title Case. For example:

- `AHMAD FAUZI` becomes `Ahmad Fauzi`
- `ahmad fauzi` becomes `Ahmad Fauzi`
- Extra whitespace is collapsed and leading or trailing whitespace is removed

No other field receives Title Case normalization. Addresses, social-media identifiers, email, NIK, phone numbers, codes, and uniform sizes preserve their field-specific formatting.

The primary action remains a single operation: `Setujui & Buat Akun Pegawai`. The reviewer does not need to save corrections separately.

## Data Flow

1. The registrations page supplies the review component with the current registration values and the active placement-unit options.
2. The review component initializes the approval form from the registration record.
3. Leaving the Full Name input applies client-side Title Case normalization so the reviewer can see the final value.
4. Submitting the form sends the editable registration values together with the registration ID, join date, and employee status.
5. The server verifies HRD or ADMIN access, validates the submitted values, and independently normalizes the full name to Title Case.
6. The server re-fetches the pending registration and uses its immutable email and document references.
7. The normalized and validated submitted values are used to create the auth user, profile, unit assignment, position history, intake record, and employee document-folder name.
8. The registration record is updated with the approved status and the corrected editable values so the approval audit record matches the resulting employee data.

## Architecture

### Full-name normalization utility

A small reusable utility owns full-name normalization. It trims the value, collapses repeated whitespace, lowercases each word, then uppercases the first letter of each whitespace-separated word. Both client and server code use the same behavior.

The utility intentionally does not add special rules for titles, particles, apostrophes, hyphens, or academic abbreviations. Every whitespace-separated word follows the same normalization rule.

### Registration review form

`registration-review.tsx` owns the interactive form state required for the Full Name blur transformation. The remaining fields may use form defaults because they do not require live normalization.

Email remains visible but has no editable form control. Document buttons retain their current behavior. Select fields use the same option sets as registration and employee management forms to avoid invalid free-text values.

### Approval action

`approveRegistrationAction` treats submitted editable values as untrusted input. It validates required fields and constrained formats before creating any auth or employee records. The pending registration fetched from the database remains the source of truth for email, KTP URL, photo URL, and Drive folder ID.

The action uses the corrected birth date and gender when generating NIY, the corrected unit for the profile and unit assignment, and the corrected position for position history. The corrected full name is used in auth metadata, the profile, success messages, and the Drive folder name.

## Validation and Failure Handling

- Registration ID must reference a record with status `MENUNGGU`.
- Full name, NIK, phone, gender, marital status, birth place, birth date, last education, KTP address, domicile address, placement unit, position, uniform size, emergency name, emergency relationship, emergency phone, join date, and employee status remain required.
- NIK must contain 16 digits.
- Phone values must follow the existing Indonesian phone-number rules and are normalized consistently with registration submission.
- Gender, employee status, and uniform size must be members of their allowed sets.
- Placement unit must be a valid active unit.
- Email uniqueness checks use the immutable registration email.
- Validation must finish before auth-user creation so ordinary input errors cannot leave a partially created employee.
- Failures after auth-user creation retain the existing behavior; adding a cross-service rollback is outside this change.

Errors return the reviewer to the registrations page with a clear message. The pending registration remains available for correction and resubmission.

## Testing

Implementation follows test-driven development. Automated tests cover:

- Full-name normalization for uppercase, lowercase, mixed case, and repeated whitespace
- Only Full Name receiving Title Case normalization
- Approval parsing and validation of editable values
- Immutable email and document references being sourced from the stored registration
- Corrected name, birth data, unit, position, and emergency data being used by downstream employee records
- Rejection of invalid NIK, phone, enum, required-field, and inactive-unit values before account creation

Type checking and the existing test suite must pass after implementation.

## Out of Scope

- Editing the registration email
- Replacing or deleting uploaded documents during review
- Title Case conversion for fields other than Full Name
- Autosaving edits before approval
- A separate draft or edit-save workflow
