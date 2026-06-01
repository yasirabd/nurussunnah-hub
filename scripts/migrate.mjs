/**
 * Nurussunnah Hub — Migration Runner (via Supabase JS + pg query)
 * Jalankan: node scripts/migrate.mjs
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, "..");

// ── Load .env.local ───────────────────────────────────────────
const envPath = join(root, ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter(l => l.trim() && !l.startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_KEY  = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY tidak ada di .env.local");
  process.exit(1);
}

console.log(`🚀 Nurussunnah Hub — Migration Runner`);
console.log(`📡 ${SUPABASE_URL}`);
console.log("─".repeat(50));

// Buat admin client dengan service role
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ── Jalankan SQL via rpc exec ─────────────────────────────────
// Supabase tidak expose raw SQL endpoint via JS client,
// tapi kita bisa panggil pg via fetch ke REST /rest/v1/rpc/exec_sql
// Atau: buat function exec_sql di SQL Editor dulu.
// Alternatif: split SQL jadi statements + jalankan via supabase.rpc
//
// Cara paling reliable: gunakan fetch ke postgres REST langsung

const REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

async function runSQL(sql, label) {
  process.stdout.write(`\n⏳ ${label} ... `);
  
  // Coba via Management API dengan service role sebagai bearer  
  // (ini bekerja untuk beberapa endpoint)
  const res = await fetch(
    `https://${REF}.supabase.co/rest/v1/rpc/exec_sql`,
    {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql_query: sql }),
    }
  );

  if (res.ok) {
    console.log("✅ OK");
    return true;
  }

  // Fallback: coba endpoint query langsung
  const res2 = await fetch(
    `https://${REF}.supabase.co/pg/query`,
    {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const body2 = await res2.text();
  if (res2.ok) {
    console.log("✅ OK");
    return true;
  }

  console.log(`❌ (${res2.status})`);
  console.error(`   ${body2.slice(0, 200)}`);
  return false;
}

// ── Split & run per-statement approach ───────────────────────
async function runMigrationFile(filePath) {
  const name = filePath.split(/[\\/]/).pop();
  const sql = readFileSync(filePath, "utf-8");
  
  console.log(`\n━━━ ${name} ━━━`);

  // Split on semicolons, skip empty and comment-only lines
  const statements = sql
    .split(/;\s*(?:\n|$)/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("--") && s.replace(/--[^\n]*/g, "").trim());

  let ok = 0, skip = 0, fail = 0;

  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, " ").slice(0, 50);
    
    // Jalankan via supabase client rpc jika ada function exec_sql
    const { error } = await supabase.rpc("exec_sql", { sql_query: stmt + ";" });
    
    if (!error) {
      ok++;
    } else if (error.message?.includes("already exists") || 
               error.message?.includes("duplicate")) {
      skip++;
    } else if (error.message?.includes("exec_sql")) {
      // Function exec_sql belum ada - perlu dibuat dulu
      console.log(`\n⚠️  Function exec_sql belum ada di database.`);
      console.log(`   Buat dulu via SQL Editor:\n`);
      console.log(`   CREATE OR REPLACE FUNCTION exec_sql(sql_query text)`);
      console.log(`   RETURNS void AS $$ BEGIN EXECUTE sql_query; END; $$`);
      console.log(`   LANGUAGE plpgsql SECURITY DEFINER;`);
      return false;
    } else {
      console.log(`  ⚠️  ${preview}...`);
      console.log(`     ${error.message}`);
      fail++;
    }
  }

  console.log(`  ✅ ${ok} OK | ${skip} skip | ${fail} gagal`);
  return fail === 0;
}

const migrations = [
  join(root, "supabase/migrations/001_fase1_foundation.sql"),
  join(root, "supabase/migrations/002_fase1_rls.sql"),
];

// Coba buat exec_sql helper dulu
async function bootstrapExecSQL() {
  const bootstrap = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // Direct REST call dengan service key  
  const res = await fetch(`https://${REF}.supabase.co/rest/v1/`, {
    method: "POST",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
  });

  // Coba via query endpoint
  const res2 = await fetch(`https://${REF}.supabase.co/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql_query: "SELECT 1" }),
  });

  return res2.ok;
}

const hasExecSQL = await bootstrapExecSQL();

if (!hasExecSQL) {
  console.log("\n⚠️  Perlu setup satu kali di Supabase SQL Editor:");
  console.log("─".repeat(50));
  console.log(`
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`);
  console.log("─".repeat(50));
  console.log("Setelah menjalankan SQL di atas, jalankan ulang: npm run migrate");
  process.exit(0);
}

let allOk = true;
for (const m of migrations) {
  const ok = await runMigrationFile(m);
  if (!ok) allOk = false;
}

if (allOk) {
  console.log("\n✅ Semua migration selesai!");
} else {
  console.log("\n⚠️  Ada kegagalan. Lihat pesan di atas.");
}
