begin;

create table public.policy_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  kind text not null check (kind in ('TATA_TERTIB', 'SK')),
  document_number text check (length(document_number) between 1 and 100),
  effective_date date not null check (isfinite(effective_date)),
  file_path text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  replaces_id uuid references public.policy_documents(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  archived_by uuid references auth.users(id),
  archived_at timestamptz,
  check (kind <> 'SK' or nullif(btrim(document_number), '') is not null),
  check (replaces_id is distinct from id)
);
create index policy_documents_status_date on public.policy_documents(status, effective_date desc);
create index policy_documents_replaces on public.policy_documents(replaces_id);

create function public.can_read_policies() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid()
    and active_status in ('AKTIF', 'CUTI') and not must_change_password);
$$;
revoke all on function public.can_read_policies() from public, anon;
grant execute on function public.can_read_policies() to authenticated;

alter table public.policy_documents enable row level security;
revoke all on public.policy_documents from public, anon, authenticated;
grant select on public.policy_documents to authenticated;
grant all on public.policy_documents to service_role;
create policy policies_read on public.policy_documents for select to authenticated
using (public.can_read_policies() and (status <> 'draft' or public.is_hrd() or public.is_admin()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('policy-pdfs', 'policy-pdfs', false, 10485760, array['application/pdf']);
-- Upload/delete are server-only: no authenticated storage mutation policies.
create policy policy_pdfs_read on storage.objects for select to authenticated
using (bucket_id = 'policy-pdfs' and exists (
  select 1 from public.policy_documents d where d.file_path = name
));

create function public.save_policy_draft(
  p_id uuid, p_title text, p_kind text, p_document_number text,
  p_effective_date date, p_file_path text, p_replaces_id uuid default null,
  p_expected_updated_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_doc public.policy_documents; v_object uuid;
begin
  if not public.can_read_policies() or not (public.is_hrd() or public.is_admin()) then
    raise exception 'Hanya HRD/Admin yang dapat mengelola aturan.';
  end if;
  select * into v_doc from public.policy_documents where id = p_id for update;
  if found and (v_doc.status <> 'draft' or v_doc.updated_at is distinct from p_expected_updated_at) then
    raise exception 'Dokumen telah berubah atau sudah diterbitkan. Muat ulang halaman.';
  end if;
  if p_replaces_id is not null and not exists (
    select 1 from public.policy_documents where id = p_replaces_id and status = 'published'
  ) then raise exception 'Aturan yang diganti sudah tidak berlaku.'; end if;
  if p_file_path not like p_id::text || '/%' then raise exception 'Lokasi PDF tidak valid.'; end if;
  select id into v_object from storage.objects
    where bucket_id = 'policy-pdfs' and name = p_file_path for update;
  if not found then raise exception 'PDF belum berhasil diunggah.'; end if;
  if v_doc.id is null then
    insert into public.policy_documents(id, title, kind, document_number, effective_date, file_path, replaces_id, created_by)
    values (p_id, btrim(p_title), p_kind, nullif(btrim(p_document_number), ''), p_effective_date, p_file_path, p_replaces_id, auth.uid());
  else
    update public.policy_documents set title = btrim(p_title), kind = p_kind,
      document_number = nullif(btrim(p_document_number), ''), effective_date = p_effective_date,
      file_path = p_file_path, replaces_id = p_replaces_id, updated_at = clock_timestamp()
    where id = p_id;
  end if;
  return p_id;
end;
$$;

create function public.publish_policy(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_doc public.policy_documents;
begin
  if not public.can_read_policies() or not (public.is_hrd() or public.is_admin()) then
    raise exception 'Hanya HRD/Admin yang dapat menerbitkan aturan.';
  end if;
  select * into v_doc from public.policy_documents where id = p_id for update;
  if not found or v_doc.status <> 'draft' then raise exception 'Dokumen bukan draf.'; end if;
  if v_doc.effective_date > (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Aturan belum mulai berlaku.';
  end if;
  perform 1 from storage.objects where bucket_id = 'policy-pdfs' and name = v_doc.file_path for update;
  if not found then raise exception 'PDF tidak tersedia.'; end if;
  if v_doc.replaces_id is not null then
    update public.policy_documents set status = 'archived', archived_by = auth.uid(),
      archived_at = now(), updated_at = clock_timestamp()
    where id = v_doc.replaces_id and status = 'published';
    if not found then raise exception 'Aturan lama sudah diarsipkan atau diganti. Muat ulang halaman.'; end if;
  end if;
  update public.policy_documents set status = 'published', published_by = auth.uid(),
    published_at = now(), updated_at = clock_timestamp() where id = p_id;
end;
$$;

create function public.archive_policy(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_read_policies() or not (public.is_hrd() or public.is_admin()) then
    raise exception 'Hanya HRD/Admin yang dapat mengarsipkan aturan.';
  end if;
  update public.policy_documents set status = 'archived', archived_by = auth.uid(),
    archived_at = now(), updated_at = clock_timestamp()
  where id = p_id and status = 'published';
  if not found then raise exception 'Dokumen bukan aturan yang berlaku.'; end if;
end;
$$;

revoke all on function public.save_policy_draft(uuid,text,text,text,date,text,uuid,timestamptz) from public, anon;
revoke all on function public.publish_policy(uuid) from public, anon;
revoke all on function public.archive_policy(uuid) from public, anon;
grant execute on function public.save_policy_draft(uuid,text,text,text,date,text,uuid,timestamptz) to authenticated;
grant execute on function public.publish_policy(uuid) to authenticated;
grant execute on function public.archive_policy(uuid) to authenticated;

-- Serialize orphan cleanup with save/publish so a PDF cannot disappear mid-publication.
create function public.protect_policy_pdf() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.bucket_id = old.bucket_id and new.name = old.name
    and new.metadata is not distinct from old.metadata and new.version is not distinct from old.version
  then return new; end if;
  if old.bucket_id = 'policy-pdfs' and exists (
    select 1 from public.policy_documents where file_path = old.name
  ) then raise exception 'PDF yang dirujuk dokumen tidak boleh diubah atau dihapus.'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger protect_policy_pdf before delete or update on storage.objects
for each row when (old.bucket_id = 'policy-pdfs') execute function public.protect_policy_pdf();

commit;
