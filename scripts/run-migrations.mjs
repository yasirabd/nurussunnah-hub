/**
 * Migration Runner — Nurussunnah Hub
 * Jalankan: node scripts/run-migrations.mjs
 *
 * Membutuhkan: SUPABASE_SERVICE_ROLE_KEY di .env.local
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env manual (tanpa dotenv dependency)
const envContent = readFileSync(join(__dirname, "../.env.local"), "utf-8");
const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env.local");
  console.error("   Tambahkan: SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const migrations = [
  join(__dirname, "../supabase/migrations/001_fase1_foundation.sql"),
  join(__dirname, "../supabase/migrations/002_fase1_rls.sql"),
];

async function runMigration(filePath) {
  const fileName = filePath.split(/[\\/]/).pop();
  const sql = readFileSync(filePath, "utf-8");

  console.log(`\n⏳ Menjalankan: ${fileName}`);

  // Split by semicolon + newline untuk eksekusi per statement
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  let successCount = 0;
  let skipCount = 0;

  for (const stmt of statements) {
    const preview = stmt.substring(0, 60).replace(/\n/g, " ");
    try {
      const { error } = await supabase.rpc("exec_sql", { sql: stmt + ";" }).single();
      if (error) {
        // Ignore "already exists" errors (idempotent)
        if (
          error.message.includes("already exists") ||
          error.message.includes("duplicate")
        ) {
          skipCount++;
          continue;
        }
        console.warn(`  ⚠️  ${preview}...`);
        console.warn(`     ${error.message}`);
      } else {
        successCount++;
      }
    } catch (e) {
      console.warn(`  ⚠️  ${preview}...`);
    }
  }

  console.log(`  ✅ ${successCount} statements berhasil, ${skipCount} di-skip`);
}

// Alternative: gunakan Supabase Management API
async function runMigrationViaAPI(filePath) {
  const fileName = filePath.split(/[\\/]/).pop();
  const sql = readFileSync(filePath, "utf-8");

  console.log(`\n⏳ Menjalankan via Management API: ${fileName}`);

  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    console.error("❌ Tidak bisa ekstrak project ref dari URL");
    return;
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error(`  ❌ Error: ${JSON.stringify(result)}`);
  } else {
    console.log(`  ✅ Berhasil dijalankan`);
  }
}

console.log("🚀 Nurussunnah Hub — Migration Runner");
console.log(`📡 Project: ${SUPABASE_URL}`);
console.log("=".repeat(50));

for (const migration of migrations) {
  await runMigrationViaAPI(migration);
}

console.log("\n✅ Semua migration selesai!");
console.log("\n📋 Langkah selanjutnya:");
console.log("   1. Buat user pertama di Supabase Auth → Authentication → Users");
console.log("   2. Tambahkan role di tabel user_roles");
console.log("   3. Jalankan: npm run dev");
