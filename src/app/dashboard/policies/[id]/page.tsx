import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isPolicyId, jakartaToday } from '@/lib/policy-documents.mjs';
import { requirePolicyAccess } from '../access';
import { PolicyForm, PolicyStatusForm } from '../policy-form';
import { PdfReader } from '../pdf-reader';

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, canManage } = await requirePolicyAccess();
  const { id } = await params;
  if (!isPolicyId(id)) notFound();
  const { data: doc, error } = await supabase.from('policy_documents').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Dokumen belum dapat dimuat.');
  if (!doc) notFound();
  const { data: replacements, error: replacementError } = await supabase.from('policy_documents').select('id,title').eq('replaces_id', id).neq('status', 'draft');
  if (replacementError) throw new Error('Riwayat dokumen belum dapat dimuat.');
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/dashboard/policies" className="text-sm text-primary underline">Kembali ke dokumen</Link>
      <header className="space-y-2"><p className="text-sm font-medium text-primary">{doc.kind === 'SK' ? 'SK Yayasan' : 'Tata Tertib'}{doc.document_number ? ` | ${doc.document_number}` : ''}</p><h1 className="break-words text-2xl font-semibold">{doc.title}</h1><p className="text-sm text-muted-foreground">Mulai berlaku: {new Date(`${doc.effective_date}T00:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'UTC', dateStyle: 'long' })}</p></header>
      {doc.status === 'archived' && <aside className="space-y-2 rounded-xl border bg-muted p-4"><p className="font-semibold">Tidak Berlaku</p><p className="text-sm">Dokumen ini telah diarsipkan. Gunakan aturan yang masih berlaku sebagai rujukan.</p>{replacements?.map(item => <Link key={item.id} href={`/dashboard/policies/${item.id}`} className="block text-sm text-primary underline">Dokumen pengganti: {item.title}</Link>)}</aside>}
      {doc.status === 'draft' && <p className="rounded-xl border bg-muted p-4 text-sm">Draf - hanya terlihat oleh HRD/Admin. Periksa PDF sebelum diterbitkan.</p>}
      {doc.replaces_id && <Link href={`/dashboard/policies/${doc.replaces_id}`} className="block text-sm text-primary underline">Lihat dokumen yang digantikan</Link>}
      <PdfReader key={doc.file_path} src={`/dashboard/policies/${id}/file`} title={doc.title} />
      {canManage && doc.status === 'draft' && <section className="space-y-4"><h2 className="text-lg font-semibold">Kelola Draf</h2><PolicyForm document={doc} />{doc.effective_date > jakartaToday() ? <p className="text-sm text-muted-foreground">Aturan belum mulai berlaku. Penerbitan tersedia setelah tanggal mulai berlaku tiba.</p> : <PolicyStatusForm id={id} action="publish" replaces={!!doc.replaces_id} />}</section>}
      {canManage && doc.status === 'published' && <section className="space-y-4"><Link href={`/dashboard/policies/new?replaces=${id}`} className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Buat Pengganti</Link><PolicyStatusForm id={id} action="archive" replaces={false} /></section>}
    </div>
  );
}
