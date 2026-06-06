# Bulk Import Pegawai Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 3-step wizard for HRD/Admin to upload `.xlsx` file and bulk import employee data (profiles + auth accounts + roles + home assignments).

**Architecture:** Client-side Excel parse via `xlsx` (SheetJS) for instant preview, then send validated JSON rows to a single Server Action that processes each row (create auth user, insert profile, assign PEGAWAI role, sync home unit). Skip invalid rows (no NIY, unit not found, duplicate email), report results.

**Tech Stack:** Next.js 14 App Router, Server Actions, Supabase admin client, `xlsx` npm package, shadcn/ui components

---

### Task 1: Install `xlsx` dependency

**Files:**
- Modify: `package.json`

- [ ] **Install xlsx package**

```bash
npm install xlsx
```

Expected: `xlsx` added to `package.json` dependencies, installed in `node_modules`

---

### Task 2: Add "Import Massal" button to employee directory page

**Files:**
- Modify: `src/app/dashboard/employees/page.tsx`

- [ ] **Add import button next to "Tambah Pegawai"**

Find the action buttons section in `EmployeesPage` (around the card header area where `canManageEmployees` is used). Add a Link button:

```tsx
{canManageEmployees && (
  <div className="flex gap-2">
    <Link
      href="/dashboard/employees/import"
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <Upload className="h-4 w-4" />
      Import Massal
    </Link>
    <Link
      href="/dashboard/employees/new"
      className={buttonVariants({ size: "sm" })}
    >
      <Plus className="h-4 w-4" />
      Tambah Pegawai
    </Link>
  </div>
)}
```

Add `Upload` and `Plus` to the lucide-react import.

Also import `buttonVariants` if not already present (check imports — `Button` and `buttonVariants` from `@/components/ui/button`).

---

### Task 3: Create server action for bulk import

**Files:**
- Modify: `src/app/dashboard/employees/actions.ts`

- [ ] **Add type for import row and result**

After existing imports, add:

```ts
export type BulkImportRow = {
  rowNumber: number
  full_name: string
  employee_no: string
  active_status: string
  gender: string
  marital_status: string | null
  birth_place: string | null
  birth_date: string | null
  last_education: string | null
  address_ktp: string | null
  address_domicile: string | null
  phone: string | null
  email: string
  facebook: string | null
  twitter: string | null
  instagram: string | null
  employee_status: string
  unit_name: string
}

export type ImportPreviewRow = BulkImportRow & {
  validation: 'valid' | 'skip'
  skip_reason?: string
}

export type ImportResult = {
  total: number
  success: number
  skipped: number
  errors: { row: number; reason: string }[]
}
```

- [ ] **Add helper functions for mapping**

```ts
// ——— Bulk Import Helpers ———

const GENDER_MAP: Record<string, 'L' | 'P'> = {
  'LAKI-LAKI': 'L',
  'PEREMPUAN': 'P',
}

const ACTIVE_STATUS_MAP: Record<string, 'AKTIF' | 'NONAKTIF'> = {
  'AKTIF': 'AKTIF',
  'NONAKTIF': 'NONAKTIF',
}

const EMPLOYEE_STATUS_MAP: Record<string, EmployeeStatus> = {
  'PTY': 'TETAP',
  'HONORER': 'HONORER',
  'KONTRAK': 'KONTRAK',
  'TIDAK_TETAP': 'TIDAK_TETAP',
  'PENSIUN': 'PENSIUN',
}

function normalizeGender(raw: string): 'L' | 'P' {
  return GENDER_MAP[raw.trim().toUpperCase()] ?? 'L'
}

function normalizeActiveStatus(raw: string): 'AKTIF' | 'NONAKTIF' {
  const key = raw.trim().toUpperCase()
  return ACTIVE_STATUS_MAP[key] ?? 'AKTIF'
}

function normalizeEmployeeStatus(raw: string): EmployeeStatus {
  const key = raw.trim().toUpperCase()
  return EMPLOYEE_STATUS_MAP[key] || 'TETAP'
}

function parseDate(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null
  // Try parsing various Indonesian date formats
  const months: Record<string, string> = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12',
    'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
    'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
  }
  const trimmed = raw.trim()
  // Format: "12 August 1958"
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (match) {
    const month = months[match[2].toLowerCase()]
    if (month) return `${match[3]}-${month}-${String(parseInt(match[1])).padStart(2, '0')}`
  }
  // Try native Date parse as fallback
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function guessEmail(row: BulkImportRow): string {
  if (row.email && row.email.includes('@')) return row.email.toLowerCase().replace(/\s/g, '')
  // Fallback: employee_no@ns-school.sch.id
  return `${row.employee_no}@ns-school.sch.id`
}
```

- [ ] **Add `importBulkEmployeesAction` server action**

```ts
export async function importBulkEmployeesAction(
  rows: BulkImportRow[]
): Promise<ImportResult> {
  const supabase = await ensureCanManageEmployees()

  // Fetch unit lookup and active academic year once
  const [unitResult, yearResult] = await Promise.all([
    supabase.from('units').select('id, name'),
    supabase.from('academic_years').select('id').eq('is_active', true).maybeSingle(),
  ])

  const unitMap = new Map<string, string>()
  for (const u of unitResult.data ?? []) {
    unitMap.set(u.name.trim().toLowerCase(), u.id)
  }

  const activeYearId = yearResult.data?.id ?? null
  const admin = createAdminClient()

  const result: ImportResult = { total: rows.length, success: 0, skipped: 0, errors: [] }

  for (const row of rows) {
    // --- Validation ---
    if (!row.employee_no || !row.employee_no.trim()) {
      result.skipped++
      result.errors.push({ row: row.rowNumber, reason: 'NIY kosong' })
      continue
    }

    const unitId = unitMap.get(row.unit_name.trim().toLowerCase())
    if (!unitId) {
      result.skipped++
      result.errors.push({ row: row.rowNumber, reason: `Unit "${row.unit_name}" tidak ditemukan di sistem` })
      continue
    }

    // Check duplicate email or NIY
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .or(`employee_no.eq.${row.employee_no.trim()},email.eq.${guessEmail(row)}`)
      .maybeSingle()

    if (existing) {
      result.skipped++
      result.errors.push({ row: row.rowNumber, reason: 'NIY atau email sudah terdaftar' })
      continue
    }

    // --- Create Auth User ---
    const email = guessEmail(row)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: DEFAULT_EMPLOYEE_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: row.full_name.trim(),
        employee_no: row.employee_no.trim().toUpperCase(),
      },
    })

    if (authError || !authData.user?.id) {
      result.skipped++
      result.errors.push({ row: row.rowNumber, reason: `Gagal buat akun: ${authError?.message ?? 'unknown'}` })
      continue
    }

    const userId = authData.user.id

    // --- Insert Profile ---
    const employeeNo = row.employee_no.trim().toUpperCase().replace(/\s/g, '')
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      full_name: row.full_name.trim(),
      employee_no: employeeNo,
      email,
      phone: row.phone || null,
      gender: normalizeGender(row.gender),
      marital_status: row.marital_status || null,
      birth_place: row.birth_place || null,
      birth_date: parseDate(row.birth_date),
      last_education: row.last_education || null,
      address_ktp: row.address_ktp || null,
      address_domicile: row.address_domicile || row.address_ktp || null,
      facebook: row.facebook || null,
      twitter: row.twitter || null,
      instagram: row.instagram || null,
      employee_status: normalizeEmployeeStatus(row.employee_status),
      active_status: normalizeActiveStatus(row.active_status),
      home_unit_id: unitId,
      must_change_password: true,
    })

    if (profileError) {
      result.skipped++
      result.errors.push({ row: row.rowNumber, reason: `Gagal insert profile: ${profileError.message}` })
      continue
    }

    // --- Assign PEGAWAI role ---
    await supabase.from('user_roles').insert({
      user_id: userId,
      role: 'PEGAWAI',
    })

    // --- Sync home assignment ---
    if (activeYearId) {
      await supabase.from('user_unit_assignments').upsert({
        user_id: userId,
        unit_id: unitId,
        assignment_type: 'HOME',
        academic_year_id: activeYearId,
      }, { onConflict: 'user_id,unit_id,assignment_type,academic_year_id' })
    }

    result.success++
  }

  revalidatePath('/dashboard/employees')
  return result
}
```

---

### Task 4: Create the import wizard page (server component shell)

**Files:**
- Create: `src/app/dashboard/employees/import/page.tsx`

- [ ] **Create import page server component**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ImportWizardClient } from "../_components/import-wizard-client";

export const metadata: Metadata = { title: "Import Massal Pegawai" };

export default async function ImportBulkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roleNames = (roles ?? []).map((r) => r.role);
  if (!roleNames.includes("HRD") && !roleNames.includes("ADMIN")) redirect("/dashboard");

  // Pre-fetch units for validation on server
  const { data: units } = await supabase.from("units").select("id, name").order("name");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard/employees"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-3 -ml-3 w-fit" })}
          >
            <ArrowLeft className="h-4 w-4" />
            Daftar Pegawai
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal">Import Massal Pegawai</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Upload file Excel (.xlsx) untuk mengimport data pegawai dalam jumlah besar.
            Baris dengan data tidak valid akan dilewati.
          </p>
        </div>
      </div>

      <ImportWizardClient serverUnits={(units ?? []).map((u) => ({ id: u.id, name: u.name }))} />
    </div>
  );
}
```

---

### Task 5: Create import wizard client component

**Files:**
- Create: `src/app/dashboard/employees/_components/import-wizard-client.tsx`

- [ ] **Create client component for 3-step wizard**

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, Loader2, ArrowRight, ArrowLeft as ArrowLeftIcon } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importBulkEmployeesAction } from "../actions";
import type { BulkImportRow, ImportPreviewRow, ImportResult } from "../actions";

type UnitOption = { id: string; name: string };

type Step = "upload" | "preview" | "result";

export function ImportWizardClient({ serverUnits }: { serverUnits: UnitOption[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const unitNamesLower = new Set(serverUnits.map((u) => u.name.toLowerCase()));

  // --- Parse & Validate ---
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Hanya file .xlsx yang didukung.");
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    // Find header row — look for row with "NO" and "NAMA"
    // The data starts at row 1 (after header) in the raw sheet
    // sheet_to_json already skips empty, but let's find the actual data rows
    const rows: BulkImportRow[] = [];
    let headerFound = false;

    for (const raw of json) {
      const values = Object.values(raw).map((v) => String(v).trim());
      const keys = Object.keys(raw);

      // Detect header
      if (!headerFound) {
        const headerStr = values.join(" ").toUpperCase();
        if (headerStr.includes("NAMA") || headerStr.includes("NIY")) {
          headerFound = true;
        }
        continue;
      }

      const nama = raw[keys[1]]?.toString().trim() ?? "";
      const niy = raw[keys[3]]?.toString().trim() ?? "";
      const statusAktif = raw[keys[2]]?.toString().trim() ?? "";
      const gender = raw[keys[4]]?.toString().trim() ?? "";
      const maritalStatus = raw[keys[5]]?.toString().trim() ?? "";
      const birthPlace = raw[keys[6]]?.toString().trim() ?? "";
      const birthDate = raw[keys[7]]?.toString().trim() ?? "";
      const position = raw[keys[8]]?.toString().trim() ?? "";
      const lastEdu = raw[keys[9]]?.toString().trim() ?? "";
      const unit = raw[keys[10]]?.toString().trim() ?? "";
      const alamatKtp = raw[keys[11]]?.toString().trim() ?? "";
      const alamatDomisili = raw[keys[12]]?.toString().trim() ?? "";
      const phone = raw[keys[13]]?.toString().trim() ?? "";
      const email = raw[keys[14]]?.toString().trim() ?? "";
      const facebook = raw[keys[15]]?.toString().trim() ?? "";
      const twitter = raw[keys[16]]?.toString().trim() ?? "";
      const instagram = raw[keys[17]]?.toString().trim() ?? "";
      const statusKepegawaian = raw[keys[18]]?.toString().trim() ?? "";

      if (!nama && !niy) continue; // skip empty rows

      const row: BulkImportRow = {
        rowNumber: rows.length + 1,
        full_name: nama,
        employee_no: niy,
        active_status: statusAktif,
        gender,
        marital_status: maritalStatus || null,
        birth_place: birthPlace || null,
        birth_date: birthDate || null,
        last_education: lastEdu || null,
        address_ktp: alamatKtp || null,
        address_domicile: alamatDomisili || null,
        phone: phone || null,
        email,
        facebook: facebook || null,
        twitter: twitter || null,
        instagram: instagram || null,
        employee_status: statusKepegawaian,
        unit_name: unit,
      };

      rows.push(row);
    }

    // Validate each row
    const validated: ImportPreviewRow[] = rows.map((row) => {
      const reasons: string[] = [];

      if (!row.employee_no || !row.employee_no.trim()) {
        reasons.push("NIY kosong");
      }

      if (!row.unit_name || !unitNamesLower.has(row.unit_name.toLowerCase())) {
        reasons.push(`Unit "${row.unit_name}" tidak ditemukan`);
      }

      return {
        ...row,
        validation: reasons.length > 0 ? "skip" : "valid",
        skip_reason: reasons.length > 0 ? reasons.join("; ") : undefined,
      };
    });

    setFileName(file.name);
    setPreviewRows(validated);
    setStep("preview");
  }, [unitNamesLower]);

  // --- Handle Import ---
  const handleImport = async () => {
    const validRows = previewRows.filter((r) => r.validation === "valid");
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const res = await importBulkEmployeesAction(validRows);
      setResult(res);
      setStep("result");
    } catch (err) {
      alert("Terjadi kesalahan saat import. Silakan coba lagi.");
    } finally {
      setImporting(false);
    }
  };

  // --- Reset ---
  const handleReset = () => {
    setStep("upload");
    setFileName("");
    setPreviewRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <StepDot label="Upload" active={step === "upload"} done={step !== "upload"} />
        <StepConnector />
        <StepDot label="Preview" active={step === "preview"} done={step === "result"} />
        <StepConnector />
        <StepDot label="Hasil" active={step === "result"} done={false} />
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Pilih File Excel</CardTitle>
            <CardDescription>
              File harus berformat .xlsx dengan kolom: NAMA, NIY, UNIT, EMAIL, dan lainnya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="flex cursor-pointer flex-col items-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed border-muted-foreground/25 p-12 transition-colors hover:border-primary/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Klik untuk upload file .xlsx</p>
              <p className="text-sm text-muted-foreground">atau drag & drop file ke sini</p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Pratinjau Data</CardTitle>
              <CardDescription>
                File: <strong>{fileName}</strong> — {previewRows.length} baris ditemukan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <SummaryBadge icon={CheckCircle2} label="Valid" value={previewRows.filter((r) => r.validation === "valid").length} variant="success" />
                <SummaryBadge icon={XCircle} label="Akan di-skip" value={previewRows.filter((r) => r.validation === "skip").length} variant="destructive" />
              </div>
            </CardContent>
          </Card>

          {/* Table Preview */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">NAMA</th>
                      <th className="px-3 py-2 text-left">NIY</th>
                      <th className="px-3 py-2 text-left">UNIT</th>
                      <th className="px-3 py-2 text-left">EMAIL</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 100).map((row) => (
                      <tr key={row.rowNumber} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                        <td className="px-3 py-2">{row.full_name}</td>
                        <td className="px-3 py-2">{row.employee_no}</td>
                        <td className="px-3 py-2">{row.unit_name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.email}</td>
                        <td className="px-3 py-2">
                          {row.validation === "valid" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                              <CheckCircle2 className="h-3 w-3" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive" title={row.skip_reason}>
                              <XCircle className="h-3 w-3" /> {row.skip_reason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 100 && (
                  <p className="p-3 text-center text-sm text-muted-foreground">
                    ... dan {previewRows.length - 100} baris lainnya
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              <ArrowLeftIcon className="h-4 w-4" />
              Kembali
            </Button>
            <Button onClick={handleImport} disabled={importing || previewRows.filter((r) => r.validation === "valid").length === 0}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Import {previewRows.filter((r) => r.validation === "valid").length} Pegawai
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle>Hasil Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <SummaryBadge icon={CheckCircle2} label="Berhasil" value={result.success} variant="success" />
              <SummaryBadge icon={XCircle} label="Gagal / Skip" value={result.skipped} variant="destructive" />
              <SummaryBadge icon={AlertTriangle} label="Total" value={result.total} variant="default" />
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-[var(--radius-md)] border p-3">
                <p className="mb-2 text-sm font-medium">Detail yang dilewati:</p>
                <div className="max-h-48 overflow-auto text-sm text-muted-foreground">
                  {result.errors.slice(0, 50).map((err, i) => (
                    <p key={i} className="py-0.5">
                      Baris #{err.row}: {err.reason}
                    </p>
                  ))}
                  {result.errors.length > 50 && (
                    <p className="py-0.5 text-xs">... dan {result.errors.length - 50} lainnya</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                Import File Lain
              </Button>
              <Button onClick={() => router.push("/dashboard/employees")}>
                Lihat Daftar Pegawai
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Sub-components ---

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-sm ${active ? "font-semibold text-primary" : done ? "text-green-600" : "text-muted-foreground"}`}>
      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
        active ? "bg-primary text-primary-foreground" :
        done ? "bg-green-600 text-white" :
        "bg-muted text-muted-foreground"
      }`}>
        {done ? "✓" : label[0]}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

function StepConnector() {
  return <div className="h-px flex-1 bg-border" />;
}

function SummaryBadge({ icon: Icon, label, value, variant }: {
  icon: React.ElementType;
  label: string;
  value: number;
  variant: "success" | "destructive" | "default";
}) {
  const colors = {
    success: "border-green-200 bg-green-50 text-green-700",
    destructive: "border-red-200 bg-red-50 text-red-700",
    default: "border-border bg-muted text-foreground",
  };
  return (
    <div className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 ${colors[variant]}`}>
      <Icon className="h-5 w-5" />
      <div>
        <p className="text-xs">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}
```

---

### Task 6: End-to-end verification

- [ ] **Build and check for errors**

```bash
npm run build 2>&1
```

Expected: No TypeScript or build errors. Verify that:
- Import page renders at `/dashboard/employees/import`
- "Import Massal" button shows for ADMIN/HRD users
- Upload wizard works through all 3 steps
- Data correctly parsed from `dist/data_bulk.xlsx`
- Server action runs without errors (can test by running build to catch TS issues)
