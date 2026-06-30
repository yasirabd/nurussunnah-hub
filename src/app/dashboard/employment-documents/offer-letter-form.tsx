"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  OFFER_LETTER_FIELDS,
  OFFER_LETTER_SECTIONS,
} from "@/lib/offer-letter-docx.mjs";

type Field = (typeof OFFER_LETTER_FIELDS)[number];

const CURRENCY_FIELDS = new Set(["basic_salary", "fixed_allowance", "take_home_pay"]);

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function digitsOf(value: string) {
  return Number(value.replace(/\D/g, "") || "0");
}

const initialValues = Object.fromEntries(
  OFFER_LETTER_FIELDS.map((field) => [field.name, ""]),
) as Record<string, string>;

export function OfferLetterForm() {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [thpTouched, setThpTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filledRequired = useMemo(
    () =>
      OFFER_LETTER_FIELDS.filter((field) => field.required && values[field.name].trim()).length,
    [values],
  );
  const totalRequired = useMemo(
    () => OFFER_LETTER_FIELDS.filter((field) => field.required).length,
    [],
  );

  function setField(name: string, raw: string) {
    const isCurrency = CURRENCY_FIELDS.has(name);
    const next = isCurrency ? formatCurrencyInput(raw) : raw;

    setValues((prev) => {
      const updated = { ...prev, [name]: next };

      if (
        (name === "basic_salary" || name === "fixed_allowance") &&
        !thpTouched
      ) {
        const basic = digitsOf(name === "basic_salary" ? next : prev.basic_salary);
        const allowance = digitsOf(
          name === "fixed_allowance" ? next : prev.fixed_allowance,
        );
        const total = basic + allowance;
        updated.take_home_pay = total ? total.toLocaleString("id-ID") : "";
      }

      return updated;
    });

    if (errors[name] && next.trim()) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Record<string, boolean> = {};
    for (const field of OFFER_LETTER_FIELDS) {
      if (field.required && !values[field.name].trim()) nextErrors[field.name] = true;
    }
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast.error("Lengkapi data yang wajib diisi", {
        description: "Beberapa kolom masih kosong dan ditandai merah.",
      });
      const first = OFFER_LETTER_FIELDS.find((field) => nextErrors[field.name]);
      if (first) {
        document.getElementById(`offer-letter-${first.name}`)?.focus();
      }
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Menyiapkan dokumen DOCX...");
    try {
      const formData = new FormData();
      for (const field of OFFER_LETTER_FIELDS) {
        formData.append(field.name, values[field.name]);
      }

      const res = await fetch("/dashboard/employment-documents/offer-letter", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Gagal membuat dokumen.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const fileName = match?.[1] ?? "surat-penawaran-kerja.docx";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("Dokumen berhasil dibuat", {
        id: toastId,
        description: `${fileName} telah diunduh.`,
      });
    } catch (error) {
      toast.error("Gagal membuat dokumen", {
        id: toastId,
        description: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Surat Penawaran Kerja</p>
            <p className="text-sm text-muted-foreground">
              Isi data di bawah, lalu unduh file DOCX siap cetak.
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground sm:text-right">
          <span className="font-medium text-foreground">{filledRequired}</span>
          {" / "}
          {totalRequired} kolom wajib terisi
        </div>
      </div>

      {OFFER_LETTER_SECTIONS.map((section, index) => {
        const sectionFields = OFFER_LETTER_FIELDS.filter(
          (field) => field.section === section.id,
        );
        return (
          <Card key={section.id}>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {section.title}
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
              {sectionFields.map((field) => (
                <FieldControl
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  invalid={Boolean(errors[field.name])}
                  onChange={(next) => {
                    if (field.name === "take_home_pay") setThpTouched(true);
                    setField(field.name, next);
                  }}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-[var(--radius-lg)] border bg-card/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          Pastikan data sudah benar sebelum mengunduh.
        </p>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {submitting ? "Memproses..." : "Generate DOCX"}
        </Button>
      </div>
    </form>
  );
}

function FieldControl({
  field,
  value,
  invalid,
  onChange,
}: {
  field: Field;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const id = `offer-letter-${field.name}`;
  const help = (field as { help?: string }).help;
  const placeholder = (field as { placeholder?: string }).placeholder;
  const isCurrency = field.type === "currency";

  const describedBy = help ? `${id}-help` : undefined;
  const common = {
    id,
    name: field.name,
    value,
    "aria-invalid": invalid,
    "aria-describedby": describedBy,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  };

  return (
    <div className={field.type === "textarea" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </Label>

      {field.type === "textarea" ? (
        <Textarea {...common} rows={3} placeholder={placeholder} />
      ) : field.type === "select" ? (
        <select
          {...common}
          className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
        >
          <option value="">Pilih {field.label.toLowerCase()}</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : isCurrency ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            Rp
          </span>
          <Input
            {...common}
            type="text"
            inputMode="numeric"
            placeholder="0"
            className="pl-9"
          />
        </div>
      ) : (
        <Input {...common} type={field.type} placeholder={placeholder} />
      )}

      {help ? (
        <p id={describedBy} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}
