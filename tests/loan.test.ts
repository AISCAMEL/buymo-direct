import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyPayment, simulateLoan, loanPlan } from '../lib/loan';

test('0%は元金÷回数', () => {
  assert.equal(monthlyPayment(120000, 0, 12), 10000);
});

test('金利付きは元金÷回数より大きく、妥当な範囲', () => {
  const m = monthlyPayment(1200000, 6.8, 60);
  assert.ok(m > 20000 && m < 24000, `想定外の月々: ${m}`);
});

test('頭金で融資額が減る', () => {
  const r = simulateLoan({ price: 2000000, downPayment: 500000, bonusPrincipal: 0, aprPercent: 6.8, months: 60 });
  assert.equal(r.financed, 1500000);
});

test('ボーナス併用で月々が下がりボーナス額が発生', () => {
  const base = simulateLoan({ price: 2000000, downPayment: 0, bonusPrincipal: 0, aprPercent: 6.8, months: 60 });
  const bonus = simulateLoan({ price: 2000000, downPayment: 0, bonusPrincipal: 600000, aprPercent: 6.8, months: 60 });
  assert.ok(bonus.monthly < base.monthly, '月々が下がっていない');
  assert.ok(bonus.bonus > 0, 'ボーナス額が0');
});

test('ボーナス不可回数(<6)ではボーナス0', () => {
  const r = simulateLoan({ price: 1000000, downPayment: 0, bonusPrincipal: 500000, aprPercent: 6.8, months: 4 });
  assert.equal(r.bonusCount, 0);
  assert.equal(r.bonus, 0);
});

test('総支払は融資額以上・回数を保持', () => {
  const p = loanPlan(1000000, 6.8, 36);
  assert.ok(p.total >= 1000000);
  assert.equal(p.months, 36);
  assert.ok(p.interest > 0);
});
