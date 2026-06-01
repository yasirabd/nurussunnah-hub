/**
 * Seed script — Nurussunnah Hub
 * Buat akun admin + data dummy pegawai
 * Jalankan: node scripts/seed.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, "..");

// ── Load .env.local ───────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf-8")
    .split("\n")
    .filter(l => l.trim() && !l.startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_KEY  = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY tidak ada di .env.local");
  process.exit(1);
}

// Admin client (bypass RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log("🌱 Nurussunnah Hub — Seed Script");
console.log(`📡 ${SUPABASE_URL}`);
console.log("─".repeat(50));

// ── 1. Ambil unit IDs ─────────────────────────────────────────
const { data: units } = await supabase.from("units").select("id, code");
const unitMap = Object.fromEntries(units.map(u => [u.code, u.id]));
console.log("📦 Units:", Object.keys(unitMap).join(", "));

// ── 2. Ambil academic year ID ─────────────────────────────────
const { data: ay } = await supabase
  .from("academic_years").select("id, name").eq("is_active", true).single();
console.log("📅 Academic Year:", ay?.name);

// ── 3. Daftar pegawai dummy ───────────────────────────────────
const employees = [
  // ADMIN
  {
    email: "admin@nurussunnah.sch.id",
    password: "bismillahns",
    employee_no: "ADM001",
    full_name: "Ahmad Fauzi",
    gender: "L",
    birth_place: "Bandung",
    birth_date: "1985-03-15",
    phone: "081234567890",
    home_unit: "YAYASAN",
    employee_status: "TETAP",
    position: "Kepala HRD",
    roles: ["ADMIN", "HRD"],
    marital_status: "Menikah",
    last_education: "S1 Manajemen",
  },
  // HRD
  {
    email: "hrd@nurussunnah.sch.id",
    password: "bismillahns",
    employee_no: "HRD001",
    full_name: "Siti Rahmawati",
    gender: "P",
    birth_place: "Jakarta",
    birth_date: "1990-07-22",
    phone: "081298765432",
    home_unit: "YAYASAN",
    employee_status: "TETAP",
    position: "Staf HRD",
    roles: ["HRD"],
    marital_status: "Menikah",
    last_education: "S1 Psikologi",
  },
  // Kepala Unit SD
  {
    email: "kepsek.sd@nurussunnah.sch.id",
    password: "bismillahns",
    employee_no: "SD001",
    full_name: "Ustadz Hasan Basri",
    gender: "L",
    birth_place: "Surabaya",
    birth_date: "1978-11-10",
    phone: "081311223344",
    home_unit: "SD",
    employee_status: "TETAP",
    position: "Kepala Sekolah SD",
    roles: ["KEPALA_UNIT", "PEGAWAI"],
    marital_status: "Menikah",
    last_education: "S2 Pendidikan Islam",
  },
  // Guru SD 1
  {
    email: "guru.sd1@nurussunnah.sch.id",
    password: "bismillahns",
    employee_no: "SD002",
    full_name: "Aminah Putri Dewi",
    gender: "P",
    birth_place: "Yogyakarta",
    birth_date: "1995-04-05",
    phone: "081322334455",
    home_unit: "SD",
    employee_status: "TETAP",
    position: "Guru Kelas",
    roles: ["PEGAWAI"],
    marital_status: "Menikah",
    last_education: "S1 PGSD",
  },
  // Guru SD 2
  {
    email: "guru.sd2@nurussunnah.sch.id",
    password: "bismillahns",
    employee_no: "SD003",
    full_name: "Muhammad Rizki",
    gender: "L",
    birth_place: "Makassar",
    birth_date: "1993-09-18",
    phone: "081333445566",
    home_unit: "SD",
    employee_status: "TIDAK_TETAP",
    position: "Guru Mapel",
    roles: ["PEGAWAI"],
    marital_status: "Belum Menikah",
    last_education: "S1 Matematika",
  },
  // Kepala Unit SMP
  {
    email: "kepsek.smp@nurussunnah.sch.id",
    password: "bismillahns",
    employee_no: "SMP001",
    full_name: "Ustadz Abdul Karim",
    gender: "L",
    birth_place: "Padang",
    birth_date: "1975-06-25",
    phone: "081344556677",
    home_unit: "SMP",
    employee_status: "TETAP",
    position: "Kepala Sekolah SMP",
    roles: ["KEPALA_UNIT", "PEGAWAI"],
    marital_status: "Menikah",
    last_education: "S2 Pendidikan",
  },
  // Guru SMP
  {
    email: "guru.smp1@nurussunnah.sch.id",
    password: "bismillahns",
    employee_no: "SMP002",
    full_name: "Fatimah Az-Zahra",
    gender: "P",
    birth_place: "Semarang",
    birth_date: "1991-12-30",
    phone: "081355667788",
    home_unit: "SMP",
    employee_status: "TETAP",
    position: "Guru Bahasa Arab",
    roles: ["PEGAWAI"],
    marital_status: "Menikah",
    last_education: "S1 Bahasa Arab",
  },
  // Kepala MA
  {
    email: "kepsek.ma@nurussunnah.sch.id",
    password: "bismillahns",
    employee_no: "MA001",
    full_name: "Ustadz Zainul Arifin",
    gender: "L",
    birth_place: "Jombang",
    birth_date: "1972-02-14",
    phone: "081366778899",
    home_unit: "MA",
    employee_status: "TETAP",
    position: "Kepala Madrasah Aliyah",
    roles: ["KEPALA_UNIT", "PEGAWAI"],
    marital_status: "Menikah",
    last_education: "S2 Ilmu Hadits",
  },
  // Guru MA
  {
    email: "guru.ma1@nurussunnah.sch.id",
    password: "bismillahns",
    employee_no: "MA002",
    full_name: "Umar Farouq",
    gender: "L",
    birth_place: "Kediri",
    birth_date: "1988-08-17",
    phone: "081377889900",
    home_unit: "MA",
    employee_status: "TETAP",
    position: "Guru Tahfidz",
    roles: ["PEGAWAI"],
    marital_status: "Menikah",
    last_education: "Hafidz Al-Quran + S1 Tarbiyah",
  },
  // Staf TK
  {
    email: "guru.tk1@nurussunnah.sch.id",
    password: "bismillahns",
    employee_no: "TK001",
    full_name: "Khadijah Nur",
    gender: "P",
    birth_place: "Cirebon",
    birth_date: "1997-01-08",
    phone: "081388990011",
    home_unit: "TK",
    employee_status: "KONTRAK",
    position: "Guru TK",
    roles: ["PEGAWAI"],
    marital_status: "Belum Menikah",
    last_education: "S1 PAUD",
  },
];

// ── 4. Buat users & profiles ──────────────────────────────────
let created = 0, skipped = 0, failed = 0;

for (const emp of employees) {
  process.stdout.write(`\n👤 ${emp.full_name} (${emp.email}) ... `);

  // Cek apakah user sudah ada
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("employee_no", emp.employee_no)
    .maybeSingle();

  if (existing) {
    console.log("⏭️  sudah ada");
    skipped++;
    continue;
  }

  // Buat auth user
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: emp.email,
    password: emp.password,
    email_confirm: true,
    user_metadata: {
      employee_no: emp.employee_no,
      full_name: emp.full_name,
      gender: emp.gender,
    },
  });

  if (authErr) {
    if (authErr.message.includes("already been registered")) {
      // User auth ada tapi profile belum — ambil ID dari auth
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingAuth = users?.users?.find(u => u.email === emp.email);
      if (existingAuth) {
        authUser = { user: existingAuth };
      }
    } else {
      console.log(`❌ Auth error: ${authErr.message}`);
      failed++;
      continue;
    }
  }

  const uid = authUser?.user?.id;
  if (!uid) { console.log("❌ No UID"); failed++; continue; }

  // Insert profile
  const { error: profErr } = await supabase.from("profiles").insert({
    id: uid,
    employee_no: emp.employee_no,
    full_name: emp.full_name,
    gender: emp.gender,
    email: emp.email,
    phone: emp.phone,
    birth_place: emp.birth_place,
    birth_date: emp.birth_date,
    marital_status: emp.marital_status,
    last_education: emp.last_education,
    home_unit_id: unitMap[emp.home_unit],
    employee_status: emp.employee_status,
    is_active: true,
  });

  if (profErr) { console.log(`❌ Profile: ${profErr.message}`); failed++; continue; }

  // Insert roles
  for (const role of emp.roles) {
    await supabase.from("user_roles").insert({ user_id: uid, role }).select();
  }

  // Insert position history
  await supabase.from("position_histories").insert({
    user_id: uid,
    position_name: emp.position,
    unit_id: unitMap[emp.home_unit],
    start_date: "2020-07-01",
    is_current: true,
  });

  // Insert unit assignment
  if (ay) {
    await supabase.from("user_unit_assignments").insert({
      user_id: uid,
      unit_id: unitMap[emp.home_unit],
      assignment_type: "HOME",
      academic_year_id: ay.id,
    });
  }

  console.log("✅");
  created++;
}

// ── 5. Summary ────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
console.log(`✅ Selesai! Dibuat: ${created} | Dilewati: ${skipped} | Gagal: ${failed}`);
console.log("\n📋 Akun yang bisa digunakan untuk login:");
console.log("─".repeat(50));
const accounts = [
  ["Admin/HRD", "admin@nurussunnah.sch.id", "bismillahns"],
  ["HRD", "hrd@nurussunnah.sch.id", "bismillahns"],
  ["Kepala SD", "kepsek.sd@nurussunnah.sch.id", "bismillahns"],
  ["Guru SD", "guru.sd1@nurussunnah.sch.id", "bismillahns"],
  ["Kepala SMP", "kepsek.smp@nurussunnah.sch.id", "bismillahns"],
  ["Kepala MA", "kepsek.ma@nurussunnah.sch.id", "bismillahns"],
];
for (const [label, email, pass] of accounts) {
  console.log(`  [${label}]`);
  console.log(`    Email   : ${email}`);
  console.log(`    Password: ${pass}`);
}
