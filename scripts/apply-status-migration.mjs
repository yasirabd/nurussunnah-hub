/**
 * Apply the employee/active status migration to the Supabase project in .env.local.
 *
 * Usage:
 *   node scripts/apply-status-migration.mjs <SUPABASE_ACCESS_TOKEN>
 *
 * The service role key cannot run arbitrary DDL through PostgREST. This uses the
 * Supabase Management API with a personal access token from the dashboard.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = process.argv[2] ?? process.env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_ACCESS_TOKEN;
const projectRef = supabaseUrl?.match(/^https:\/\/([^.]+)\.supabase\.co$/)?.[1];

if (!projectRef) {
  console.error("Missing or invalid NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}

if (!accessToken) {
  console.error("Usage: node scripts/apply-status-migration.mjs <SUPABASE_ACCESS_TOKEN>");
  process.exit(1);
}

const migrationPath = join(root, "supabase", "migrations", "019_employee_active_statuses.sql");
const query = readFileSync(migrationPath, "utf8").replace(/^\uFEFF/, "");

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
});

const body = await response.text();

if (!response.ok) {
  console.error(`Migration failed: HTTP ${response.status}`);
  console.error(body);
  process.exit(1);
}

console.log(`Applied 019_employee_active_statuses.sql to ${projectRef}`);
console.log(body || "OK");
