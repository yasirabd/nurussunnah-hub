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
