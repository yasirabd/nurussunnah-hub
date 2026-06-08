# Reset All Passwords Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (\- [ ]\) syntax for tracking.

**Goal:** Reset semua password user di Supabase Auth ke default \"bismillahns\" dan set must_change_password = true.

**Architecture:** Satu script Node.js ESM yang baca .env.local, fetch semua user via supabase.auth.admin.listUsers(), update tiap user password via Admin API, lalu update kolom must_change_password di profiles.

**Tech Stack:** Node.js, @supabase/supabase-js, dotenv

---

### Task 1: Buat script reset-all-passwords.mjs

**Files:**
- Create: scripts/reset-all-passwords.mjs
- (Referensi) src/lib/supabase/admin.ts — pola init admin client

- [ ] **Step 1.1: Load env & init admin client**
  Baca .env.local (pakai dotenv atau parsing manual), init createClient dengan service_role key.
  Ikutin pola dari src/lib/supabase/admin.ts.

- [ ] **Step 1.2: Fetch semua user dengan pagination**
  Gunakan supabase.auth.admin.listUsers({ page, perPage: 1000 }) dalam loop.
  Kumpulkan semua user ID + email.

- [ ] **Step 1.3: Reset password & set must_change_password**
  Untuk tiap user:
  - supabase.auth.admin.updateUserById(id, { password: \"bismillahns\" })
  - supabase.from('profiles').update({ must_change_password: true }).eq('id', id)
  - Log sukses/gagal per user

- [ ] **Step 1.4: Print summary**
  Cetak: total user diproses, sukses, gagal, detail error kalo ada

- [ ] **Step 1.5: Validasi syntax**
  Jalankan 
ode --check scripts/reset-all-passwords.mjs untuk validasi syntax

### Task 2: Eksekusi script

- [ ] **Step 2.1: Jalankan script**
  
ode scripts/reset-all-passwords.mjs dan verifikasi output
