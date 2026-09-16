import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePolicyInput, validatePolicyPdf, jakartaToday, isPolicyId } from '../src/lib/policy-documents.mjs';

const input = { title: ' Tata tertib ', kind: 'TATA_TERTIB', document_number: '', effective_date: '2026-09-16' };

test('policy metadata trims fields and requires a number for SK', () => {
  assert.equal(validatePolicyInput(input).title, 'Tata tertib');
  assert.equal(validatePolicyInput(input).document_number, null);
  assert.throws(() => validatePolicyInput({ ...input, kind: 'SK' }), /Nomor/);
  assert.throws(() => validatePolicyInput({ ...input, title: ' ' }), /Judul/);
  assert.throws(() => validatePolicyInput({ ...input, kind: 'PRIVATE' }), /Jenis/);
  assert.throws(() => validatePolicyInput({ ...input, effective_date: '2026-02-30' }), /Tanggal/);
});

test('Jakarta publication date crosses midnight independently of UTC', () => {
  assert.equal(jakartaToday(new Date('2026-09-15T17:00:00Z')), '2026-09-16');
  assert.equal(jakartaToday(new Date('2026-09-15T16:59:59Z')), '2026-09-15');
});

test('PDF acceptance checks bytes, MIME, size and empty files', async () => {
  const pdf = new File(['%PDF-1.7\n%%EOF'], 'aturan.pdf', { type: 'application/pdf' });
  await validatePolicyPdf(pdf);
  await assert.rejects(validatePolicyPdf(new File(['<html>'], 'fake.pdf', { type: 'application/pdf' })), /PDF/);
  await assert.rejects(validatePolicyPdf(new File(['%PDF-1.7'], 'fake.pdf', { type: 'text/html' })), /PDF/);
  await assert.rejects(validatePolicyPdf(new File([], 'empty.pdf', { type: 'application/pdf' })), /kosong/);
  await assert.rejects(validatePolicyPdf(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' })), /10 MiB/);
});

test('document identifiers reject traversal and malformed UUIDs', () => {
  assert.equal(isPolicyId('adf1d9cd-749b-43df-bce5-0cc333e900ce'), true);
  assert.equal(isPolicyId('../secret'), false);
  assert.equal(isPolicyId(''), false);
});
