import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    vars[key] = val;
  }
  return vars;
}

const env = loadEnv();
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not found');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not found');

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = 'bismillahns';

async function fetchAllUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(`listUsers page ${page}: ${error.message}`);
    if (!data || !data.users || data.users.length === 0) break;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }
  return users;
}

async function main() {
  console.log('Fetching all users...');
  const users = await fetchAllUsers();
  console.log(`Found ${users.length} users.\n`);

  let success = 0;
  let failed = 0;

  for (const user of users) {
    const id = user.id;
    const email = user.email || '(no email)';

    try {
      // 1. Reset password via Admin API
      const { error: pwdErr } = await supabase.auth.admin.updateUserById(id, {
        password: PASSWORD,
      });
      if (pwdErr) throw new Error(`password reset: ${pwdErr.message}`);

      // 2. Set must_change_password flag
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', id);

      if (profileErr) {
        // Non-fatal: profile might not exist yet
        console.warn(`  ⚠  ${email} (${id}) profile update: ${profileErr.message}`);
      }

      console.log(`  ✓ ${email} (${id})`);
      success++;
    } catch (err) {
      console.error(`  ✗ ${email} (${id}): ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! ${success} sukses, ${failed} gagal dari ${users.length} user.`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
