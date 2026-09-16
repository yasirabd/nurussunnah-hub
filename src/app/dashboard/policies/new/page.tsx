import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePolicyAccess } from '../access';
import { PolicyForm } from '../policy-form';
import { isPolicyId } from '@/lib/policy-documents.mjs';

export default async function NewPolicyPage({ searchParams }: { searchParams: Promise<{ replaces?: string }> }) {
  const { supabase } = await requirePolicyAccess(true);
  const { replaces } = await searchParams;
  let previous;
  if (replaces) {
    if (!isPolicyId(replaces)) notFound();
    const { data, error } = await supabase.from('policy_documents').select('*').eq('id', replaces).eq('status', 'published').maybeSingle();
    if (error) throw new Error('Tidak dapat memuat aturan sebelumnya.');
    if (!data) notFound();
    previous = data;
  }
  return <div className="mx-auto max-w-3xl space-y-6"><Link href="/dashboard/policies" className="text-sm text-primary underline">Kembali ke dokumen</Link><h1 className="text-2xl font-semibold">{previous ? 'Buat Aturan Pengganti' : 'Tambah Dokumen'}</h1><PolicyForm replaces={previous} /></div>;
}
