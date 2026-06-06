"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
} from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  // Convert Excel serial date number (days since 1899-12-30) to YYYY-MM-DD
  function serialDateToISO(serial: number): string {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    return dateInfo.toISOString().slice(0, 10);
  }

  function toStr(v: unknown): string {
    if (v === null || v === undefined) return "";
    return String(v).trim();
  }

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        alert("Hanya file .xlsx yang didukung.");
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      const rows: BulkImportRow[] = [];
      const keyCache = json[0] ? Object.keys(json[0]) : [];

      function col(keyName: string, raw: Record<string, unknown>): string {
        // Find the column by header name (case-insensitive match)
        const found = keyCache.find(
          (k) => k.toUpperCase().trim() === keyName.toUpperCase().trim()
        );
        return toStr(found ? raw[found] : "");
      }

      // Pre-compute column name lookups
      const colIdx = (name: string) => {
        const idx = keyCache.findIndex(
          (k) => k.toUpperCase().trim() === name.toUpperCase().trim()
        );
        return idx >= 0
          ? (raw: Record<string, unknown>) => toStr(raw[keyCache[idx]])
          : () => "";
      };

      const getNama = colIdx("NAMA");
      const getNiy = colIdx("NIY");
      const getStatusAktif = colIdx("STATUS AKTIF");
      const getGender = colIdx("JENIS KELAMIN");
      const getMarital = colIdx("STATUS PERKAWINAN");
      const getBirthPlace = colIdx("TEMPAT LAHIR");
      const getBirthDate = colIdx("TANGGAL LAHIR");
      const getLastEdu = colIdx("IJAZAH TERAKHIR");
      const getUnit = colIdx("UNIT");
      const getAlamatKtp = colIdx("ALAMAT KTP");
      const getAlamatDomisili = colIdx("ALAMAT DOMISILI");
      const getPhone = colIdx("HANDPHONE");
      const getEmail = colIdx("EMAIL");
      const getFacebook = colIdx("FACEBOOK");
      const getTwitter = colIdx("TWITTER");
      const getInstagram = colIdx("INSTAGRAM");
      const getStatusKepeg = colIdx("STATUS KEPEGAWAIAN");

      for (const raw of json) {
        const nama = getNama(raw);
        const niy = getNiy(raw);
        if (!nama && !niy) continue;

        let birthDateStr = getBirthDate(raw);
        // Convert Excel serial date number to ISO date
        const birthNum = Number(birthDateStr);
        if (!isNaN(birthNum) && birthNum > 20000 && birthNum < 60000) {
          birthDateStr = serialDateToISO(birthNum);
        }

        rows.push({
          rowNumber: rows.length + 1,
          full_name: nama,
          employee_no: niy,
          active_status: getStatusAktif(raw),
          gender: getGender(raw),
          marital_status: getMarital(raw) || null,
          birth_place: getBirthPlace(raw) || null,
          birth_date: birthDateStr || null,
          last_education: getLastEdu(raw) || null,
          address_ktp: getAlamatKtp(raw) || null,
          address_domicile: getAlamatDomisili(raw) || null,
          phone: getPhone(raw) || null,
          email: getEmail(raw),
          facebook: getFacebook(raw) || null,
          twitter: getTwitter(raw) || null,
          instagram: getInstagram(raw) || null,
          employee_status: getStatusKepeg(raw),
          unit_name: getUnit(raw),
        });
      }

      const validated: ImportPreviewRow[] = rows.map((row) => {
        const reasons: string[] = [];

        // Auto-generate NIY for empty NIY
        let employeeNo = row.employee_no;
        if (!employeeNo || !employeeNo.trim()) {
          employeeNo = `H-${row.rowNumber}`;
        }

        if (
          !row.unit_name ||
          !unitNamesLower.has(row.unit_name.toLowerCase())
        ) {
          reasons.push(`Unit "${row.unit_name}" tidak ditemukan`);
        }
        return {
          ...row,
          employee_no: employeeNo,
          validation: reasons.length > 0 ? "skip" : "valid",
          skip_reason: reasons.length > 0 ? reasons.join("; ") : undefined,
        };
      });

      setFileName(file.name);
      setPreviewRows(validated);
      setStep("preview");
    },
    [unitNamesLower],
  );

  const handleImport = async () => {
    const validRows = previewRows.filter((r) => r.validation === "valid");
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const res = await importBulkEmployeesAction(validRows);
      setResult(res);
      setStep("result");
    } catch {
      alert("Terjadi kesalahan saat import. Silakan coba lagi.");
    } finally {
      setImporting(false);
    }
  };

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
        <StepDot
          label="Upload"
          active={step === "upload"}
          done={step !== "upload"}
        />
        <StepConnector />
        <StepDot
          label="Preview"
          active={step === "preview"}
          done={step === "result"}
        />
        <StepConnector />
        <StepDot
          label="Hasil"
          active={step === "result"}
          done={false}
        />
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Pilih File Excel</CardTitle>
            <CardDescription>
              File harus berformat .xlsx dengan kolom: NAMA, NIY, UNIT, EMAIL,
              dan lainnya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="flex cursor-pointer flex-col items-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed border-muted-foreground/25 p-12 transition-colors hover:border-primary/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Klik untuk upload file .xlsx</p>
              <p className="text-sm text-muted-foreground">
                atau drag &amp; drop file ke sini
              </p>
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
          <Card>
            <CardHeader>
              <CardTitle>Pratinjau Data</CardTitle>
              <CardDescription>
                File: <strong>{fileName}</strong> &mdash;{" "}
                {previewRows.length} baris ditemukan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <SummaryBadge
                  icon={CheckCircle2}
                  label="Valid"
                  value={previewRows.filter((r) => r.validation === "valid").length}
                  variant="success"
                />
                <SummaryBadge
                  icon={XCircle}
                  label="Akan di-skip"
                  value={previewRows.filter((r) => r.validation === "skip").length}
                  variant="destructive"
                />
              </div>
            </CardContent>
          </Card>

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
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.rowNumber}
                        </td>
                        <td className="px-3 py-2">{row.full_name}</td>
                        <td className="px-3 py-2">{row.employee_no}</td>
                        <td className="px-3 py-2">{row.unit_name}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.email}
                        </td>
                        <td className="px-3 py-2">
                          {row.validation === "valid" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                              <CheckCircle2 className="h-3 w-3" /> Valid
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium text-destructive"
                              title={row.skip_reason}
                            >
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
            <Button
              onClick={handleImport}
              disabled={
                importing ||
                previewRows.filter((r) => r.validation === "valid")
                  .length === 0
              }
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Import{" "}
                  {previewRows.filter((r) => r.validation === "valid").length}{" "}
                  Pegawai
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
              <SummaryBadge
                icon={CheckCircle2}
                label="Berhasil"
                value={result.success}
                variant="success"
              />
              <SummaryBadge
                icon={XCircle}
                label="Gagal / Skip"
                value={result.skipped}
                variant="destructive"
              />
              <SummaryBadge
                icon={AlertTriangle}
                label="Total"
                value={result.total}
                variant="default"
              />
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
                    <p className="py-0.5 text-xs">
                      ... dan {result.errors.length - 50} lainnya
                    </p>
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

function StepDot({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-sm ${
        active
          ? "font-semibold text-primary"
          : done
            ? "text-green-600"
            : "text-muted-foreground"
      }`}
    >
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
          active
            ? "bg-primary text-primary-foreground"
            : done
              ? "bg-green-600 text-white"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? "\u2713" : label[0]}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

function StepConnector() {
  return <div className="h-px flex-1 bg-border" />;
}

function SummaryBadge({
  icon: Icon,
  label,
  value,
  variant,
}: {
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
    <div
      className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 ${colors[variant]}`}
    >
      <Icon className="h-5 w-5" />
      <div>
        <p className="text-xs">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}
