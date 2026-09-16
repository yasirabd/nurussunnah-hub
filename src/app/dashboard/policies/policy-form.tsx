'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PolicyDocument } from '@/types/database';
import { savePolicyDraft, changePolicyStatus } from './actions';

export function PolicyForm({ document, replaces }: { document?: PolicyDocument; replaces?: PolicyDocument }) {
  const [state, action, pending] = useActionState(savePolicyDraft, { error: '' });
  return (
    <form action={action} className="space-y-5 rounded-xl border bg-card p-5">
      <input type="hidden" name="id" value={document?.id ?? ''} />
      <input type="hidden" name="updated_at" value={document?.updated_at ?? ''} />
      <input type="hidden" name="replaces_id" value={document?.replaces_id ?? replaces?.id ?? ''} />
      {replaces && <p className="text-sm text-muted-foreground">Menggantikan: {replaces.title}. Aturan lama tetap berlaku sampai pengganti diterbitkan.</p>}
      <fieldset disabled={pending} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="policy-title">Judul dokumen</Label><Input id="policy-title" name="title" required maxLength={200} defaultValue={document?.title ?? replaces?.title} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="policy-kind">Jenis dokumen</Label><select id="policy-kind" name="kind" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={document?.kind ?? replaces?.kind ?? 'TATA_TERTIB'}><option value="TATA_TERTIB">Tata Tertib</option><option value="SK">SK Yayasan</option></select></div>
          <div className="space-y-2"><Label htmlFor="policy-number">Nomor dokumen (wajib untuk SK)</Label><Input id="policy-number" name="document_number" maxLength={100} defaultValue={document?.document_number ?? ''} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="policy-date">Tanggal mulai berlaku</Label><Input id="policy-date" name="effective_date" type="date" required defaultValue={document?.effective_date} /><p className="text-xs text-muted-foreground">Dokumen hanya dapat diterbitkan setelah tanggal ini tiba.</p></div>
        <div className="space-y-2"><Label htmlFor="policy-pdf">{document ? 'Ganti PDF (opsional)' : 'Berkas PDF'}</Label><Input id="policy-pdf" name="pdf" type="file" accept="application/pdf,.pdf" required={!document} aria-describedby="policy-pdf-help" /><p id="policy-pdf-help" className="text-xs text-muted-foreground">PDF maksimal 10 MiB. Simpan draf, lalu periksa sebelum menerbitkan.</p></div>
      </fieldset>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan Draf'}</Button>
    </form>
  );
}

export function PolicyStatusForm({ id, action, replaces }: { id: string; action: 'publish' | 'archive'; replaces: boolean }) {
  const [state, submit, pending] = useActionState(changePolicyStatus, { error: '' });
  return (
    <form action={submit} className="space-y-3 rounded-xl border bg-card p-4">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="action" value={action} />
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="confirmed" required disabled={pending} className="mt-1" /><span>{action === 'publish' ? `PDF sudah diperiksa dan siap dibaca semua pegawai.${replaces ? ' Aturan lama akan diarsipkan bersamaan.' : ''}` : 'Aturan ini sudah tidak berlaku dan akan dipindahkan ke arsip.'}</span></label>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} variant={action === 'archive' ? 'outline' : 'default'}>{pending ? 'Memproses...' : action === 'publish' ? 'Terbitkan' : 'Arsipkan'}</Button>
    </form>
  );
}
