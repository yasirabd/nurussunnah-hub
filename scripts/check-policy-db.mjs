// Run against a disposable PGlite database: node scripts/check-policy-db.mjs <path-to-pglite/dist/index.js>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.argv[2]) throw new Error('Pass the installed @electric-sql/pglite/dist/index.js path.');
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const admin = '00000000-0000-4000-8000-000000000001';
const employee = '00000000-0000-4000-8000-000000000002';
const hrd = '00000000-0000-4000-8000-000000000003';
const doc = '10000000-0000-4000-8000-000000000001';
const replacement = '10000000-0000-4000-8000-000000000002';
const rival = '10000000-0000-4000-8000-000000000003';
const future = '10000000-0000-4000-8000-000000000004';

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.profiles(id uuid primary key, active_status text, must_change_password boolean default false);
    create table public.user_roles(user_id uuid, role text);
    create function public.is_admin() returns boolean language sql stable security definer as
      $$ select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'ADMIN') $$;
    create function public.is_hrd() returns boolean language sql stable security definer as
      $$ select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'HRD') $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, metadata jsonb, version text, last_accessed_at timestamptz);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant all on storage.objects to authenticated, service_role;
    insert into auth.users values ('${admin}'), ('${employee}'), ('${hrd}');
    insert into public.profiles(id,active_status) values ('${admin}','AKTIF'), ('${employee}','AKTIF'), ('${hrd}','AKTIF');
    insert into public.user_roles values ('${admin}','ADMIN'), ('${hrd}','HRD');
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/043_policy_documents.sql', import.meta.url), 'utf8'));
  async function asUser(id, role = 'authenticated') {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    await db.exec(`set role ${role}`);
  }
  async function seedFile(id) {
    await db.exec('reset role');
    await db.query("insert into storage.objects(bucket_id,name) values ('policy-pdfs',$1)", [`${id}/file.pdf`]);
  }
  async function save(id, replaces = null, date = '2020-01-01', kind = 'TATA_TERTIB', number = null, expected = null) {
    return db.query('select public.save_policy_draft($1,$2,$3,$4,$5,$6,$7,$8)', [id, 'Aturan uji', kind, number, date, `${id}/file.pdf`, replaces, expected]);
  }
  const publish = id => db.query('select public.publish_policy($1)', [id]);
  const rows = async (sql, args = []) => (await db.query(sql, args)).rows;

  await asUser('', 'anon');
  await assert.rejects(db.query('select * from public.policy_documents'), /permission denied/);
  await assert.rejects(publish(doc), /permission denied/);

  await seedFile(doc);
  await asUser(admin);
  await save(doc);
  assert.equal((await rows('select * from public.policy_documents')).length, 1);
  await assert.rejects(save(doc), /berubah/);
  await asUser(employee);
  assert.equal((await rows('select * from public.policy_documents')).length, 0);
  assert.equal((await rows('select * from storage.objects')).length, 0);
  await assert.rejects(publish(doc), /HRD\/Admin/);
  await assert.rejects(save(doc), /HRD\/Admin/);
  await assert.rejects(db.query("update public.policy_documents set status='published'"), /permission denied/);
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values ('policy-pdfs','fake')"), /row-level security/);

  await asUser(hrd);
  await publish(doc);
  await assert.rejects(save(doc), /berubah/);
  await asUser(employee);
  assert.equal((await rows('select * from public.policy_documents')).length, 1);
  assert.equal((await rows('select * from storage.objects')).length, 1);
  assert.equal((await rows("delete from storage.objects where bucket_id='policy-pdfs' returning id")).length, 0);

  await asUser(admin, 'service_role');
  await db.query("update storage.objects set last_accessed_at=now() where name=$1", [`${doc}/file.pdf`]);
  await assert.rejects(db.query("delete from storage.objects where name=$1", [`${doc}/file.pdf`]), /tidak boleh/);
  await assert.rejects(db.query("update storage.objects set version='overwritten' where name=$1", [`${doc}/file.pdf`]), /tidak boleh/);

  await seedFile(future);
  await asUser(admin);
  await assert.rejects(save(future, null, '2999-01-01', 'SK'), /check constraint/);
  await save(future, null, '2999-01-01');
  await assert.rejects(publish(future), /belum mulai berlaku/);
  for (const id of [replacement, rival]) {
    await seedFile(id);
    await asUser(admin);
    await save(id, doc);
  }
  await publish(replacement);
  await assert.rejects(publish(rival), /sudah diarsipkan/);
  assert.equal((await rows('select status from public.policy_documents where id=$1', [rival]))[0].status, 'draft');
  assert.equal((await rows('select status from public.policy_documents where id=$1', [doc]))[0].status, 'archived');
  assert.equal((await rows('select status from public.policy_documents where id=$1', [replacement]))[0].status, 'published');
  await db.query('select public.archive_policy($1)', [replacement]);
  await assert.rejects(publish(replacement), /bukan draf/);
  await asUser(employee);
  assert.equal((await rows('select * from public.policy_documents')).length, 2);

  await db.exec('reset role');
  await db.query("update public.profiles set active_status='NONAKTIF' where id=$1", [employee]);
  await asUser(employee);
  assert.equal((await rows('select * from public.policy_documents')).length, 0);
  assert.equal((await rows('select * from storage.objects')).length, 0);
  await db.exec('reset role');
  await db.query('update public.profiles set must_change_password=true where id=$1', [admin]);
  await asUser(admin);
  await assert.rejects(publish(future), /HRD\/Admin/);
  console.log('Policy SQL checks passed: roles, RLS, immutable PDFs, stale drafts, dates, replacement rollback, archival, inactive/password-change access.');
} finally {
  await db.close();
}
