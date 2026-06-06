import pathlib
path = 'src/app/dashboard/employees/actions.ts'
content = pathlib.Path(path).read_text(encoding='utf-8')

old = "const { error: profileError } = await supabase.from('profiles').insert({"
new = "const { error: profileError } = await supabase.from('profiles').upsert("

if old in content:
    content = content.replace(old, new, 1)
    # Also change the closing }) to }, { onConflict: 'id' })
    # Find the first }) after the first .upsert(
    upsert_idx = content.index('.upsert(')
    close_insert = content.index('\n    })', upsert_idx)
    content = content[:close_insert] + "      }, { onConflict: 'id' })" + content[close_insert+6:]
    pathlib.Path(path).write_text(content, encoding='utf-8')
    print('Fixed upsert')
else:
    print('Not found')
