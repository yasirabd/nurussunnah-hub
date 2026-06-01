INSERT INTO storage.buckets (id, name, public)
VALUES ('work-statement-pdfs', 'work-statement-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "work_statement_pdfs_owner_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'work-statement-pdfs'
  AND split_part(name, '/', 1)::uuid = auth.uid()
);

CREATE POLICY "work_statement_pdfs_owner_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'work-statement-pdfs'
  AND split_part(name, '/', 1)::uuid = auth.uid()
);

CREATE POLICY "work_statement_pdfs_owner_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'work-statement-pdfs'
  AND split_part(name, '/', 1)::uuid = auth.uid()
)
WITH CHECK (
  bucket_id = 'work-statement-pdfs'
  AND split_part(name, '/', 1)::uuid = auth.uid()
);

CREATE POLICY "work_statement_pdfs_hrd_admin_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'work-statement-pdfs'
  AND (public.is_hrd() OR public.is_admin())
);
