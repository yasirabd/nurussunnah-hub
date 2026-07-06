import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateOfferLetterDocx, normalizeOfferLetterPayload } from "@/lib/offer-letter-docx.mjs";

type OfferLetterValues = Record<string, string> & { candidate_name: string };
type OfferLetterPayload =
  | { ok: true; values: OfferLetterValues }
  | { ok: false; missing: string[]; values: OfferLetterValues };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url));

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roleNames = (roles ?? []).map((item) => item.role);
  if (!roleNames.includes("HRD") && !roleNames.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const formData = await request.formData();
  const payload = normalizeOfferLetterPayload(formData) as OfferLetterPayload;
  if (!payload.ok) {
    return new NextResponse(`Field wajib belum diisi: ${payload.missing.join(", ")}`, { status: 400 });
  }

  const templateResponse = await fetch(new URL("/templates/template_surat_penawaran_kerja.docx", request.url));
  if (!templateResponse.ok) return new NextResponse("Template surat tidak ditemukan.", { status: 500 });

  const templateBytes = await templateResponse.arrayBuffer();
  const docxBytes = await generateOfferLetterDocx(templateBytes, payload.values);
  const fileName = `surat-penawaran-kerja-${slugify(payload.values.candidate_name)}.docx`;

  return new NextResponse(Buffer.from(docxBytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "kandidat";
}
