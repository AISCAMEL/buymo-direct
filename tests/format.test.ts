import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMileage, formatYen } from '../lib/format';

test('1万km以上は「◯.◯万km」', () => {
  assert.equal(formatMileage(15000), '1.5万km');
  assert.equal(formatMileage(38000), '3.8万km');
});

test('1万km未満はカンマ区切り', () => {
  assert.equal(formatMileage(8000), '8,000km');
});

test('formatYen は数値を含む', () => {
  const s = formatYen(1500000);
  assert.ok(s.includes('1,500,000'), `got ${s}`);
});
