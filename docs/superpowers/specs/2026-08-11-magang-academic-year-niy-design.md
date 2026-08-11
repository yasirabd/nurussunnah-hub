# Magang Academic-Year NIY Design

## Context

The current NIY generator creates a numeric identifier from birth month, join month, gender, and a global sequence. The same generator is used by employee intake and registration approval, while direct employee forms permit a manually entered NIY. Bulk import uses a temporary `H-<row>` fallback when NIY is empty.

Magang employees need a distinct NIY series that identifies their employment category and starting academic year. HRD/Admin must also be able to correct the generated value manually without breaking the numbering rule.

## Goals

1. Generate Magang NIY in the format `MAG-YYYY-NNN`.
2. Derive `YYYY` from the starting year of the academic year containing the Magang start date.
3. Reset the sequence to `001` for each academic year.
4. Prevent duplicate automatic numbers during concurrent saves.
5. Generate a new regular NIY when an employee changes from `MAGANG` to `CPTY`.
6. Support employee forms, registration approval, intake, and Excel import.

## Non-Goals

- Do not infer start dates for existing Magang employees through a bulk data migration.
- Do not create a complete employment-status history module.
- Do not change login, role, active-status, attendance, leave, or feedback behavior.
- Do not renumber employees whose current status and NIY remain unchanged.

## NIY Rules

### Magang Format

The Magang format is:

```text
MAG-<academic-year-start>-<three-digit-sequence>
```

Examples:

- First Magang employee in academic year `2026/2027`: `MAG-2026-001`.
- Second Magang employee in academic year `2026/2027`: `MAG-2026-002`.
- First Magang employee in academic year `2027/2028`: `MAG-2027-001`.

The year segment is calculated from `academic_years.start_date`, not directly from the calendar year of the submitted date and not by parsing the academic-year name. The effective date must be between an academic year's `start_date` and `end_date`, inclusive.

### Manual Correction

HRD/Admin may edit an automatically proposed Magang NIY. A manual value must:

1. Match `MAG-YYYY-NNN` exactly after uppercase and whitespace normalization.
2. Use the starting year of the academic year containing the Magang start date.
3. Use a positive three-digit sequence from `001` through `999`.
4. Remain unique in `profiles.employee_no`.

Manual corrections participate in future numbering. If `MAG-2026-010` exists, the next automatic number for academic year `2026/2027` is at least `MAG-2026-011`.

### Conversion to CPTY

When the stored status is `MAGANG` and HRD/Admin changes it to `CPTY`:

1. `Tanggal Pengangkatan CPTY` is required.
2. A new regular NIY is generated using the existing regular format.
3. The regular NIY uses the employee's birth date, gender, CPTY appointment month, and next reserved regular sequence.
4. The former Magang NIY is replaced; it is not retained as the active `profiles.employee_no`.

## Data Model

Add `profiles.employee_status_effective_date date`. For the scoped transitions:

- `MAGANG`: stores Tanggal Mulai Magang.
- `MAGANG` to `CPTY`: stores Tanggal Pengangkatan CPTY.

Add a counter table with a unique series key and last reserved value. Series keys include:

- `MAG:<academic_year_id>` for each Magang academic-year sequence.
- `REGULAR` for the existing global regular sequence.

The table stores reservations, not employee ownership. A reserved number is never decremented or reused if a later account-creation step fails. Gaps are acceptable because preventing duplicates is more important than uninterrupted numbering.

## Database Allocation

A security-definer RPC available only to authenticated HRD/Admin performs automatic allocation. It must validate the caller's role and set `search_path = public`.

For a Magang allocation, the RPC:

1. Finds exactly one academic year containing the effective date.
2. Locks or atomically upserts the counter row for `MAG:<academic_year_id>`.
3. Reads the highest valid stored `MAG-YYYY-NNN` sequence for that academic year.
4. Advances from the greater of the stored counter or stored-profile maximum.
5. Rejects allocation after sequence `999`.
6. Returns the formatted NIY.

For a regular allocation, the RPC reserves the next global regular sequence after comparing the counter with valid existing numeric NIY suffixes. The application supplies the birth date, gender, and effective date needed to build the existing regular NIY format.

The database unique constraint on `profiles.employee_no` remains the final duplicate guard.

## Form Behavior

The shared employee form tracks the selected employee status.

### Selecting Magang

When `MAGANG` is selected:

- Show required `Tanggal Mulai Magang`.
- Show a provisional `MAG-YYYY-NNN` preview when the date matches an academic year.
- Populate the NIY input with the preview and mark it as automatic.
- If HRD/Admin edits the NIY input, switch it to manual mode.
- Changing the effective date recalculates the automatic preview unless manual mode is active.

The server never trusts the preview. In automatic mode it reserves the actual number through the RPC during submission. The final sequence may differ from the preview if another operation reserves a number first.

### Editing Existing Magang Employees

Existing Magang records are corrected through the edit form rather than a guessing migration. HRD/Admin supplies Tanggal Mulai Magang. If the stored NIY is not a valid Magang NIY for the selected academic year, the form proposes a replacement and the server requires either a valid manual value or automatic allocation.

### Converting Magang to CPTY

When a stored `MAGANG` employee is changed to `CPTY`:

- Show required `Tanggal Pengangkatan CPTY`.
- Switch the NIY field to an automatically generated regular NIY preview.
- Reserve the actual regular sequence on submission.
- Persist the CPTY appointment date as `employee_status_effective_date`.

Unrelated edits to an already valid Magang record do not generate a new NIY.

## Entry Paths

### Direct Add and Edit

Create and update server actions normalize the status, effective date, NIY mode, and manual NIY. They re-read the stored employee status during updates so the client cannot falsely claim or hide a transition.

### Registration Approval

Registration review already provides `join_date` and `employee_status`:

- `MAGANG` uses `join_date` as Tanggal Mulai Magang and receives a Magang NIY.
- Other statuses retain regular NIY generation using `join_date`.

### Intake

The intake form's Tanggal Masuk Nurus Sunnah becomes the effective date. Selecting `MAGANG` produces the academic-year Magang format; other statuses retain regular NIY behavior.

### Excel Import

Excel import recognizes a new `TANGGAL MULAI MAGANG` column. For a `MAGANG` row with blank NIY:

- The date is required and must map to an academic year.
- The server allocates the next Magang NIY.
- The `H-<row>` fallback is not used.

If a Magang NIY is supplied manually, it must match the date's academic year and the required format. Non-Magang import behavior remains unchanged except where existing validation needs to share the new normalizer.

## Validation and Errors

Submission is rejected when:

- A required Magang start or CPTY appointment date is missing or malformed.
- The effective date does not belong to an academic year.
- More than one academic-year record contains the effective date.
- A manual Magang NIY has an invalid prefix, year, sequence, or duplicate value.
- A regular NIY cannot be built because birth date or gender is missing.
- The annual Magang sequence has exceeded `999`.

Errors must identify the field or configuration that HRD/Admin needs to correct. If automatic allocation succeeds but a later external account-creation step fails, the reserved number remains unused and the error reports the failed downstream step.

## Testing

Automated coverage must verify:

1. Dates map to the correct academic year and use its starting year.
2. `MAG-2026-001` is the first allocation for `2026/2027`.
3. The sequence resets for the next academic year.
4. A stored or manually corrected `MAG-2026-010` makes the next allocation `011` or greater.
5. Invalid format, mismatched academic-year prefix, duplicate NIY, missing date, overlapping academic years, and sequence exhaustion are rejected.
6. Concurrent allocations receive different sequences.
7. Existing Magang records receive a replacement only after HRD/Admin supplies a start date.
8. `MAGANG` to `CPTY` requires an appointment date and creates a regular NIY using that date.
9. Registration approval, intake, direct create/edit, and Excel import use the correct generation path.
10. Manual mode preserves a valid manual NIY while automatic mode reserves server-side.
11. Existing non-Magang NIY behavior and the full application test/build suite remain green.

## Success Criteria

HRD/Admin can create or correct Magang employees with NIY values such as `MAG-2026-001`, where `2026` is the starting year of the applicable academic year. Numbering resets per academic year, accounts for valid manual corrections, remains safe during concurrent saves, and converts to a newly generated regular NIY when the employee is appointed as CPTY.
