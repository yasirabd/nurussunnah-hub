import sys
path = 'src/app/dashboard/employees/actions.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the duplicate block: 'if (existingUser?.user?.id)' 
# Remove from that line to the closing '}' before 'const { error: profileError }'
start_line = None
end_line = None
for i, line in enumerate(lines):
    if line.strip().startswith('if (existingUser?.user?.id)') and start_line is None:
        start_line = i
    if start_line is not None and i > start_line:
        if line.strip() == '}' and 'const { error: profileError }' in ''.join(lines[i+1:i+2]):
            end_line = i + 1  # include the closing brace
            break

if start_line is not None and end_line is not None:
    new_lines = lines[:start_line] + lines[end_line:]
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'Removed lines {start_line+1} to {end_line}')
else:
    print(f'Not found: start={start_line}, end={end_line}')
