import XLSX from 'xlsx';
import fs from 'fs';
const buf = fs.readFileSync('dist/data_bulk.xlsx');
const wb = XLSX.read(buf, {type: 'buffer'});
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {defval: ''});
const keys = Object.keys(data[0]);

const colIdx = name => keys.findIndex(k => k.toUpperCase().trim() === name.toUpperCase().trim());
const vals = (idx) => new Set(data.map(r => String(r[keys[idx]]).trim()));

console.log('=== STATUS AKTIF ===');
for (const v of vals(colIdx('STATUS AKTIF'))) console.log('  [' + v + ']');

console.log('\n=== STATUS KEPEGAWAIAN ===');
for (const v of vals(colIdx('STATUS KEPEGAWAIAN'))) console.log('  [' + v + ']');

console.log('\n=== JENIS KELAMIN ===');
for (const v of vals(colIdx('JENIS KELAMIN'))) console.log('  [' + v + ']');

console.log('\n=== UNIT ===');
for (const v of vals(colIdx('UNIT'))) console.log('  [' + v + ']');

console.log('\n=== Column mapping ===');
keys.forEach((k, i) => console.log(i + ': ' + k));
