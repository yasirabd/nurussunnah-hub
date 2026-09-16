import { NextRequest, NextResponse } from 'next/server';
import { getFeatureAccessState } from '@/lib/auth/feature-access';
import { isPolicyId, POLICY_BUCKET } from '@/lib/policy-documents.mjs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getFeatureAccessState();
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  if (access.status !== 'allowed') return NextResponse.json({ error: 'Silakan masuk ke Hub.' }, { status: 401, headers });
  const { id } = await params;
  if (!isPolicyId(id)) return new NextResponse(null, { status: 404, headers });
  const { data: doc, error } = await access.supabase.from('policy_documents').select('file_path').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Dokumen belum dapat dimuat.' }, { status: 503, headers });
  if (!doc) return new NextResponse(null, { status: 404, headers });
  const download = request.nextUrl.searchParams.get('download') === '1';
  const { data, error: signError } = await access.supabase.storage.from(POLICY_BUCKET).createSignedUrl(doc.file_path, 60, download ? { download: `aturan-${id}.pdf` } : undefined);
  if (signError || !data) return NextResponse.json({ error: 'PDF belum dapat dibuka. Coba lagi.' }, { status: 503, headers });
  return NextResponse.redirect(data.signedUrl, { status: 307, headers });
}
