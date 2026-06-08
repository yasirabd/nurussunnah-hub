# Design: Reset All User Passwords to Default + Force Change

**Date:** 2026-06-08
**Status:** Approved

## Problem

Semua password user perlu di-reset ke default ismillahns dan user dipaksa mengganti password saat login berikutnya.

## Solution

Buat satu script Node.js (scripts/reset-all-passwords.mjs) yang:

1. Membaca konfigurasi dari .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
2. Menggunakan Supabase Admin Client (service_role) untuk:
   - Fetch **semua user** dari uth.users via supabase.auth.admin.listUsers()
   - Setiap user: supabase.auth.admin.updateUserById(id, { password: "bismillahns" })
   - Set flag must_change_password = true di tabel profiles
3. Output log: total user, sukses, gagal

## Teknis

- **Runtime:** Node.js ESM (import syntax, file .mjs)
- **Dependensi:** @supabase/supabase-js (udah di package.json)
- **Cara jalan:** 
ode scripts/reset-all-passwords.mjs
- **Error handling:** try/catch per user, lanjut ke user berikutnya, print error
- **Batch:** listUsers sudah handle pagination internal, tapi kalo ada >1000 user perlu pagination manual via listUsers({ page, perPage })

## Constraints

- Reset password **harus** via Admin API (tidak bisa SQL langsung ke uth.users)
- Service role key harus valid
- Script dijalankan di local development environment (bukan production langsung tanpa review)
- Flag must_change_password adalah kolom existing di profiles (migration 018)

## Rollback

Tidak ada rollback password setelah direset. Disarankan backup data uth.users sebelum eksekusi.
