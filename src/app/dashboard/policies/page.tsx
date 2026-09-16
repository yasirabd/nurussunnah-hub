import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { requirePolicyAccess } from './access';

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, canManage } = await requirePolicyAccess();
  const params = await searchParams;
  const status = params.status === 'archived' ? 'archived' : params.status === 'draft' && canManage ? 'draft' : 'published';
  const kind = params.kind === 'SK' || params.kind === 'TATA_TERTIB' ? params.kind : '';
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 200) : '';
  const page = Math.max(1, Math.min(10000, Number.parseInt(String(params.page || '1'), 10) || 1));
  let query = supabase.from('policy_documents').select('id,title,kind,document_number,effective_date', { count: 'exact' }).eq('status', status);
  if (kind) query = query.eq('kind', kind);
  if (q) {
    const term = q.replace(/[%_\\]/g, '\\$&').replace(/[",()]/g, ' ');
    query = query.or(`title.ilike.%${term}%,document_number.ilike.%${term}%`);
  }
  const { data, error, count } = await query.order('effective_date', { ascending: false }).order('id').range((page - 1) * 20, page * 20 - 1);
  const pageHref = (number: number) => `/dashboard/policies?${new URLSearchParams({ status, kind, q, page: String(number) })}`;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">Peraturan &amp; SK Yayasan</h1><p className="mt-2 text-sm text-muted-foreground">Rujukan tata tertib dan keputusan yayasan untuk seluruh pegawai.</p></div>
        {canManage && <Link href="/dashboard/policies/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="size-4" />Tambah Dokumen</Link>}
      </header>
      <nav aria-label="Status dokumen" className="flex gap-2 border-b pb-3">
        {([['published', 'Berlaku'], ['archived', 'Arsip'], ...(canManage ? [['draft', 'Draf']] : [])]).map(([value, label]) => <Link key={value} href={`/dashboard/policies?status=${value}`} aria-current={status === value ? 'page' : undefined} className={`rounded-md px-4 py-2 text-sm ${status === value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>{label}</Link>)}
      </nav>
      <form className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="status" value={status} />
        <div className="min-w-48 flex-1 space-y-1"><label htmlFor="policy-search" className="text-sm font-medium">Cari judul atau nomor</label><input id="policy-search" name="q" defaultValue={q} maxLength={200} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></div>
        <div className="space-y-1"><label htmlFor="policy-filter" className="text-sm font-medium">Jenis</label><select id="policy-filter" name="kind" defaultValue={kind} className="block h-10 rounded-md border bg-background px-3 text-sm"><option value="">Semua jenis</option><option value="TATA_TERTIB">Tata Tertib</option><option value="SK">SK Yayasan</option></select></div>
        <button type="submit" className="h-10 rounded-md border px-4 text-sm hover:bg-accent">Cari</button>
      </form>
      {error ? <p role="alert" className="rounded-xl border p-6 text-destructive">Dokumen belum dapat dimuat. Coba muat ulang halaman.</p> : !data?.length ? <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">{q || kind ? 'Tidak ada dokumen yang sesuai pencarian.' : status === 'draft' ? 'Belum ada draf dokumen.' : status === 'archived' ? 'Belum ada aturan yang diarsipkan.' : 'Belum ada aturan yang diterbitkan.'}</p> : <ul className="divide-y rounded-xl border bg-card">{data.map(doc => <li key={doc.id}><Link href={`/dashboard/policies/${doc.id}`} className="flex items-start gap-4 p-5 hover:bg-accent/50"><FileText className="mt-1 size-5 shrink-0 text-primary" /><div className="min-w-0"><p className="break-words font-medium">{doc.title}</p><p className="mt-1 text-sm text-muted-foreground">{doc.kind === 'SK' ? 'SK Yayasan' : 'Tata Tertib'}{doc.document_number ? ` | ${doc.document_number}` : ''}</p><p className="mt-1 text-xs text-muted-foreground">Mulai berlaku: {new Date(`${doc.effective_date}T00:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'UTC', dateStyle: 'long' })}</p>{status === 'archived' && <span className="mt-2 inline-block rounded bg-muted px-2 py-1 text-xs font-semibold">Tidak Berlaku</span>}</div></Link></li>)}</ul>}
      {!error && (page > 1 || (count ?? 0) > page * 20) && <nav aria-label="Halaman hasil" className="flex justify-between text-sm">{page > 1 ? <Link href={pageHref(page - 1)} className="underline">Sebelumnya</Link> : <span />}{(count ?? 0) > page * 20 && <Link href={pageHref(page + 1)} className="underline">Berikutnya</Link>}</nav>}
    </div>
  );
}
