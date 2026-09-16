export const POLICY_BUCKET = 'policy-pdfs';
export const POLICY_MAX_BYTES = 10 * 1024 * 1024;

export function isPolicyId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function jakartaToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function validatePolicyInput(input) {
  const title = String(input.title ?? '').trim();
  const kind = String(input.kind ?? '');
  const document_number = String(input.document_number ?? '').trim() || null;
  const effective_date = String(input.effective_date ?? '');
  if (!title || title.length > 200) throw new Error('Judul wajib diisi, maksimal 200 karakter.');
  if (!['TATA_TERTIB', 'SK'].includes(kind)) throw new Error('Jenis dokumen tidak valid.');
  if ((kind === 'SK' && !document_number) || (document_number?.length ?? 0) > 100) throw new Error('Nomor SK wajib diisi, maksimal 100 karakter.');
  const date = new Date(`${effective_date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effective_date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== effective_date) throw new Error('Tanggal mulai berlaku tidak valid.');
  return { title, kind, document_number, effective_date };
}

export async function validatePolicyPdf(file) {
  if (!(file instanceof Blob) || file.size === 0) throw new Error('PDF tidak boleh kosong.');
  if (file.size > POLICY_MAX_BYTES) throw new Error('Ukuran PDF maksimal 10 MiB.');
  if (file.type !== 'application/pdf' || await file.slice(0, 5).text() !== '%PDF-') throw new Error('Berkas harus berupa PDF yang valid.');
}
