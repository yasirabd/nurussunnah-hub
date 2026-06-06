import XLSX from 'xlsx';
import fs from 'fs';
const buf = fs.readFileSync('dist/data_bulk.xlsx');
const wb = XLSX.read(buf, {type: 'buffer'});
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {defval: ''});
const keys = Object.keys(data[0]);
const unitIdx = keys.findIndex(k => k.toUpperCase().trim() === 'UNIT');

// Count by unit
const counts = {};
for (const row of data) {
  const u = String(row[keys[unitIdx]]).trim();
  counts[u] = (counts[u] || 0) + 1;
}
console.log('UNIT distribution:');
for (const [u, c] of Object.entries(counts).sort((a,b) => b[1]-a[1])) {
  console.log('  [' + u + ']: ' + c);
}

// Check for any rows with KB-TK (non SAQU)
const kbTkRows = data.filter(r => String(r[keys[unitIdx]]).trim() === 'KB-TK');
console.log('\nRows with UNIT=KB-TK (exact):', kbTkRows.length);
