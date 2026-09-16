'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { POLICY_BUCKET, isPolicyId, validatePolicyInput, validatePolicyPdf } from '@/lib/policy-documents.mjs';
import { requirePolicyAccess } from './access';

export type PolicyFormState = { error: string };

async function cleanupPdf(path: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('policy_documents').select('id').eq('file_path', path).maybeSingle();
    if (error || data) return;
    const { error: removeError } = await admin.storage.from(POLICY_BUCKET).remove([path]);
    if (removeError) console.error('Policy orphan cleanup failed:', removeError.message);
  } catch (error) {
    console.error('Policy orphan cleanup failed:', error);
  }
}

export async function savePolicyDraft(_state: PolicyFormState, formData: FormData): Promise<PolicyFormState> {
  const { supabase } = await requirePolicyAccess(true);
  let uploadedPath: string | null = null;
  let oldPath: string | null = null;
  let id: string;
  try {
    const input = validatePolicyInput(Object.fromEntries(formData));
    id = String(formData.get('id') || crypto.randomUUID());
    const replacesId = String(formData.get('replaces_id') || '') || null;
    if (!isPolicyId(id) || (replacesId && !isPolicyId(replacesId))) throw new Error('ID dokumen tidak valid.');
    const { data: existing, error: readError } = await supabase.from('policy_documents').select('*').eq('id', id).maybeSingle();
    if (readError) throw new Error('Tidak dapat memeriksa draf. Coba lagi.');
    if (existing && existing.status !== 'draft') throw new Error('Dokumen terbit tidak dapat diubah.');
    oldPath = existing?.file_path ?? null;
    let path = oldPath;
    const file = formData.get('pdf');
    if (file instanceof File && (file.size > 0 || file.name)) {
      await validatePolicyPdf(file);
      path = `${id}/${crypto.randomUUID()}.pdf`;
      uploadedPath = path;
      const { error } = await createAdminClient().storage.from(POLICY_BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (error) throw new Error('Unggahan PDF gagal. Draf sebelumnya tetap tersimpan.');
    }
    if (!path) throw new Error('Unggah PDF terlebih dahulu.');
    const { error } = await supabase.rpc('save_policy_draft', {
      p_id: id,
      p_title: input.title,
      p_kind: input.kind,
      p_document_number: input.document_number,
      p_effective_date: input.effective_date,
      p_file_path: path,
      p_replaces_id: replacesId,
      p_expected_updated_at: String(formData.get('updated_at') || '') || null,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    if (uploadedPath) await cleanupPdf(uploadedPath);
    return { error: error instanceof Error ? error.message : 'Draf gagal disimpan. Coba lagi.' };
  }
  if (uploadedPath && oldPath) await cleanupPdf(oldPath);
  revalidatePath('/dashboard/policies', 'layout');
  redirect(`/dashboard/policies/${id}`);
}

export async function changePolicyStatus(_state: PolicyFormState, formData: FormData): Promise<PolicyFormState> {
  const { supabase } = await requirePolicyAccess(true);
  const id = String(formData.get('id') || '');
  const action = formData.get('action');
  if (!isPolicyId(id) || !['publish', 'archive'].includes(String(action))) return { error: 'Aksi tidak valid.' };
  if (formData.get('confirmed') !== 'on') return { error: 'Konfirmasi dokumen terlebih dahulu.' };
  try {
    const { error } = await supabase.rpc(action === 'publish' ? 'publish_policy' : 'archive_policy', { p_id: id });
    if (error) return { error: error.message };
  } catch {
    return { error: 'Perubahan gagal. Muat ulang halaman untuk memeriksa status sebelum mencoba lagi.' };
  }
  revalidatePath('/dashboard/policies', 'layout');
  redirect(`/dashboard/policies/${id}`);
}
