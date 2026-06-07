# Feedback Rekan — Unit Scope Design

**Date:** 2026-06-07
**Status:** Draft
**Author:** Codex

## 1. Problem

Menu Feedback Rekan saat ini menampilkan rekan kerja dari semua unit (jika migration 013 belum di-apply). Seharusnya user hanya bisa memberikan feedback kepada rekan di unit-nya masing-masing — termasuk jika user memiliki multiple assignments (lebih dari 1 unit).

### Contoh skenario

| User | Unit Assignments | Seharusnya melihat rekan dari |
|------|------------------|-------------------------------|
| Guru A | {SMP, SMA} | SMP + SMA |
| Kepala Unit SMP | {SMP} | SMP |
| HRD/Admin | {Yayasan} | Semua unit |

## 2. Requirements

1. **Unit-scoping ketat** — User hanya lihat rekan di unit yang sama (satu atau lebih)
2. **Multi-assignment support** — Jika user di-assign ke >1 unit via `user_unit_assignments`, lihat rekan dari seluruh unit tsb
3. **Kepala unit** — Lihat semua rekan di unit-nya (monitoring scoped)
4. **HRD/Admin** — Level yayasan, lihat semua unit (all-access)
5. **Security di level database** — Filter via RPC `SECURITY DEFINER`, bukan frontend
6. **UX informatif** — Tampilkan badge unit pada nama rekan jika user multi-unit

## 3. Scope

### In scope

| Komponen | Perubahan |
|----------|-----------|
| `get_feedback_targets` | Ganti DISTINCT ON → EXISTS overlap multi-unit |
| `get_feedback_monitoring_scoped` | Fix overlap serupa |
| `FeedbackTargetCarousel` | Tambah badge unit |
| Deployment migration | Migration baru `024_feedback_multi_unit_overlap` |

### Out of scope (tidak perlu diubah)

| Komponen | Alasan |
|----------|--------|
| `submit_peer_feedback` | Validasi via `get_feedback_targets`, sudah aman |
| `get_feedback_identified` | HRD/Admin tetap all-access — sesuai requirement |
| `get_received_feedback_anonymous` | Hanya per-receiver, sudah benar |
| `page.tsx` layout & metric cards | Tidak terkait scope unit |
| `UnitFilterForm` | Filter unit tetap berguna untuk HRD/Admin |

## 4. Backend Design

### 4.1 Root cause

Migration `013_feedback_effective_unit_scope.sql` menggunakan pola `DISTINCT ON (p.id)` pada CTE `target_units`:

```sql
target_units AS (
  SELECT DISTINCT ON (p.id)
    p.id AS user_id,
    COALESCE(home_assignment.unit_id, p.home_unit_id) AS unit_id
  ...
)
```

Ini hanya mengambil **1 unit per target**. Jika target memiliki multiple assignments, unit lain diabaikan — potensi false negative.

### 4.2 Fix: EXISTS overlap

Hapus CTE `target_units`. Gunakan subquery `EXISTS` untuk mendeteksi overlap antar **semua** unit target dengan **semua** unit giver.

**Pola baru `get_feedback_targets`:**

```
WITH
  my_profile → ambil user saat ini
  my_units → semua unit user saat ini

SELECT DISTINCT profiles.*
FROM profiles target
LEFT JOIN peer_feedbacks pf ON ...
WHERE target.id <> auth.uid()
  AND target.is_active
  AND target.employee_status <> '\''PENSIUN'\''
  AND (
    EXISTS (
      SELECT 1 FROM user_unit_assignments uua
      WHERE uua.user_id = target.id
        AND uua.assignment_type = '\''HOME'\''
        AND (uua.academic_year_id = p_academic_year_id OR uua.academic_year_id IS NULL)
        AND uua.unit_id IN (SELECT unit_id FROM my_units)
    )
    OR
    target.home_unit_id IN (SELECT unit_id FROM my_units)
  )
ORDER BY u.code, target.full_name;
```

**Pola `get_feedback_monitoring_scoped`:**

- Filter `profiles p` — HRD/Admin all-access, kepala unit hanya unit-nya
- Join `target` tetap via `target.home_unit_id = p.home_unit_id` untuk counting peer dalam unit sama

### 4.3 Edge cases

| Skenario | Perilaku |
|----------|----------|
| Giver di {A, B}, target di {B, C} | ✅ Overlap B |
| Giver di {A}, target di {B} | ❌ Tidak overlap |
| Giver tanpa unit assignments & home_unit_id null | ❌ Tidak bisa resolve |
| Target PENSIUN / tidak aktif | ❌ Tidak muncul |
| Giver = target | ❌ Tidak bisa feedback sendiri |

## 5. Frontend Design

### 5.1 Badge unit di carousel

**File:** `feedback-target-carousel.tsx`

Tambah badge `unit_code` setelah nama target, **hanya jika user multi-unit** (my_units > 1).

```tsx
<h2 className="font-semibold">
  {target.full_name}
  {isMultiUnit && (
    <Badge variant="outline" className="ml-2 text-xs">
      {target.unit_code}
    </Badge>
  )}
</h2>
```

**Deteksi multi-unit:** via prop baru dari page.tsx — hitung distinct unit dari targets array.

### 5.2 Tidak ada perubahan layout lain

## 6. Deployment

1. Migration file: `supabase/migrations/024_feedback_multi_unit_overlap.sql`
2. `CREATE OR REPLACE FUNCTION` untuk `get_feedback_targets` + `get_feedback_monitoring_scoped`
3. Apply via Supabase SQL Editor
4. Verifikasi via halaman Feedback Rekan

## 7. Test Scenarios

| # | Skenario | Expected |
|---|----------|----------|
| 1 | Login guru SMP saja | Lihat hanya rekan SMP |
| 2 | Login guru SMP + SMA | Lihat rekan SMP dan SMA |
| 3 | Login kepala unit SMP | Lihat pegawai SMP (monitoring) |
| 4 | Login HRD | Lihat semua pegawai |
| 5 | Login admin | Sama HRD — all-access |
| 6 | Submit feedback ke luar unit | Ditolak RPC |
