/**
 * Apply migrations via Supabase Management API
 * Run: node scripts/apply-migrations.mjs <supabase-access-token>
 *
 * Get access token from: https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CONFIG ──────────────────────────────────────────────────
const SUPABASE_URL = "https://rzbufrrkrtqrwrftltmg.supabase.co";
const PROJECT_REF  = "rzbufrrkrtqrwrftltmg";

// Ambil access token dari argument CLI: node apply-migrations.mjs <TOKEN>
const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error("❌ Usage: node scripts/apply-migrations.mjs <SUPABASE_ACCESS_TOKEN>");
  console.error("   Dapatkan token di: https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}

const migrations = [
  join(__dirname, "../supabase/migrations/001_fase1_foundation.sql"),
  join(__dirname, "../supabase/migrations/002_fase1_rls.sql"),
];

async function applyMigration(filePath) {
  const fileName = filePath.split(/[\\/]/).pop();
  const query = readFileSync(filePath, "utf-8");

  console.log(`\n⏳ Applying: ${fileName}`);

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );

  const text = await res.text();

  if (!res.ok) {
    console.error(`  ❌ HTTP ${res.status}: ${text}`);
    return false;
  }

  console.log(`  ✅ Berhasil`);
  return true;
}

console.log("🚀 Nurussunnah Hub — Apply Migrations");
console.log(`📡 Project: ${SUPABASE_URL}`);
console.log("=".repeat(50));

let allOk = true;
for (const m of migrations) {
  const ok = await applyMigration(m);
  if (!ok) allOk = false;
}

if (allOk) {
  console.log("\n✅ Semua migration berhasil!\n");
  console.log("Langkah selanjutnya:");
  console.log("  1. Buka Supabase Dashboard → Authentication → Users");
  console.log("  2. Buat user pertama (Admin/HRD)");
  console.log("  3. Di SQL Editor, jalankan:");
  console.log("     INSERT INTO user_roles (user_id, role)");
  console.log("     VALUES ('<user-id>', 'ADMIN');");
  console.log("  4. npm run dev → login ke sistem");
} else {
  console.log("\n⚠️  Ada migration yang gagal. Cek error di atas.");
}
