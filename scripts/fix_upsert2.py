import pathlib
path = 'src/app/dashboard/employees/actions.ts'
content = pathlib.Path(path).read_text(encoding='utf-8')

# Fix the upsert opening: .upsert( -> .upsert({
content = content.replace(
    "const { error: profileError } = await supabase.from('profiles').upsert(\n      id: userId!,",
    "const { error: profileError } = await supabase.from('profiles').upsert({\n      id: userId!,"
)

# Fix the upsert closing:     }) before if (profileError) ->       }, { onConflict: 'id' })
content = content.replace(
    "      must_change_password: true,\n    })\n    if (profileError) {",
    "      must_change_password: true,\n      }, { onConflict: 'id' })\n    if (profileError) {"
)

pathlib.Path(path).write_text(content, encoding='utf-8')
print('Fixed')
