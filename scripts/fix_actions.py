import pathlib, re
path = 'src/app/dashboard/employees/actions.ts'
content = pathlib.Path(path).read_text(encoding='utf-8')

marker = '// Try to find existing auth user by email via Admin API'
profile_marker = 'const { error: profileError } = await supabase'

start_idx = content.find(marker)
profile_idx = content.find(profile_marker, start_idx)

if start_idx < 0 or profile_idx < 0:
    print(f'Markers: start={start_idx}, profile={profile_idx}')
    exit(1)

new_block = """    // Try to find existing auth user by email via Admin API
    const encodedEmail = encodeURIComponent(email)
    const userUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const userResp = await fetch(userUrl + '/auth/v1/admin/users?filter=email:' + encodedEmail, {
      headers: {
        apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    })
    const userJson = await userResp.json()
    const matchedUser = userJson.users?.[0]

    if (matchedUser?.id) {
      userId = matchedUser.id
    } else {
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password: DEFAULT_EMPLOYEE_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: row.full_name.trim(),
          employee_no: employeeNo,
        },
      })
      if (authError || !authData.user?.id) {
        result.skipped++
        result.errors.push({ row: row.rowNumber, reason: 'Gagal buat akun: ' + (authError?.message ?? 'unknown') })
        continue
      }
      userId = authData.user.id
    }"""

new_content = content[:start_idx] + new_block + '\n\n    ' + content[profile_idx:]
pathlib.Path(path).write_text(new_content, encoding='utf-8')
print(f'Fixed. Start={start_idx}, Profile={profile_idx}, NewLen={len(new_content)}')
