import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

import { getFeatureAccessState } from "@/lib/auth/feature-access";
import { generateOfferLetterDocx, normalizeOfferLetterPayload } from "@/lib/offer-letter-docx.mjs";

type OfferLetterValues = Record<string, string> & { candidate_name: string };
type OfferLetterPayload =
  | { ok: true; values: OfferLetterValues }
  | { ok: false; missing: string[]; values: OfferLetterValues };

export async function POST(request: Request) {
  const access = await getFeatureAccessState();
  if (access.status === "unauthenticated") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (access.status === "password_change_required") {
    return new NextResponse("Password change required", { status: 403 });
  }
  if (access.status === "missing_profile") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { supabase, user } = access;

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

  const templateResponse = await fetchTemplate(request);
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

async function fetchTemplate(request: Request) {
  const assetUrl = "https://assets.local/templates/template_surat_penawaran_kerja.docx";
  try {
    const assets = getCloudflareContext().env.ASSETS;
    if (assets) return assets.fetch(assetUrl);
  } catch {
    // Local Next dev has no Cloudflare context.
  }

  return fetch(new URL("/templates/template_surat_penawaran_kerja.docx", request.url));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "kandidat";
}
