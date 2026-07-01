import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { OfferLetterForm } from "./offer-letter-form";

export default async function EmploymentDocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roleNames = (roles ?? []).map((item) => item.role);
  if (!roleNames.includes("HRD") && !roleNames.includes("ADMIN")) redirect("/dashboard");

  const { data: units } = await supabase
    .from("units")
    .select("name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  const unitNames = (units ?? []).map((unit) => unit.name);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Dokumen Kepegawaian</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Buat Surat Penawaran Kerja untuk kandidat pegawai baru. Lengkapi data
          per bagian, lalu unduh berkas DOCX yang siap dicetak.
        </p>
      </div>

      <OfferLetterForm unitNames={unitNames} />
    </div>
  );
}
