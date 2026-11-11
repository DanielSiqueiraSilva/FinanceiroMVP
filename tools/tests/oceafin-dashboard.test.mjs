import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  categorySpending, latestTransactions, plannerBalances, fourWeekFlow,
} from '../../src/components/dashboard/dashboard-data.ts';

const tx = (id, tipo, categoria, valor, data) =>
  ({ id, tipo, categoria, valor, data, descricao: id });

test('categories sum recorded expenses, not income; do not mutate input', () => {
  const input = Object.freeze([
    Object.freeze(tx('1', 'despesa', 'Casa', 180, '2026-11-03')),
    Object.freeze(tx('2', 'receita', 'Salário', 950, '2026-11-02')),
    Object.freeze(tx('3', 'despesa', 'Transporte', 20, '2026-11-04')),
    Object.freeze(tx('4', 'despesa', 'Casa', 20, '2026-11-05')),
  ]);
  const categories = categorySpending(input);
  assert.equal(categories.length, 2);
  assert.deepEqual(categories.map(x => [x.categoria, x.valor, x.percentual]),
    [['Casa', 200, 200 / 220 * 100], ['Transporte', 20, 20 / 220 * 100]]);
  assert.equal(input.length, 4);
});

test('empty spending and stable latest transaction ordering', () => {
  assert.deepEqual(categorySpending([tx('1', 'receita', 'Salário', 10, '2026-11-03')]), []);
  const items = [tx('b','despesa','Outros',10,'2026-11-01'),
    tx('a','despesa','Outros',20,'2026-11-07')];
  assert.deepEqual(latestTransactions(items).map(x=>x.id), ['a','b']);
  assert.deepEqual(items.map(x=>x.id), ['b','a']);
  assert.deepEqual(latestTransactions(items,1).map(x=>x.id), ['a']);
});

test('account and card summaries do not count as monthly result', () => {
  const planner = {
    accounts:[{id:'a'}], cards:[{id:'c'}],
    accountOverview:[{estimated_balance:100},{estimated_balance:250}],
    cardOverview:[{unpaid_total:45},{unpaid_total:5}],
  };
  assert.deepEqual(plannerBalances(planner), {
    accountTotal:350, cardPending:50, hasAccounts:true, hasCards:true,
  });
  assert.equal(plannerBalances(null).accountTotal, null);
  assert.equal(plannerBalances(null).cardPending, null);
  assert.equal(plannerBalances({...planner, accountOverview:[]}).accountTotal, null);
});

test('four-week chart uses recorded income/expenses and never changes source', () => {
  const items = Object.freeze([
    Object.freeze(tx('a','receita','Salário',500,'2026-11-02')),
    Object.freeze(tx('b','despesa','Moradia',250,'2026-11-08')),
    Object.freeze(tx('c','despesa','Casa',50,'2026-11-09')),
    Object.freeze(tx('d','receita','Outros',300,'2026-11-25')),
  ]);
  const result = fourWeekFlow(items);
  assert.deepEqual(result.map(w => [w.income,w.expense]),
    [[500,250],[0,50],[0,0],[300,0]]);
  assert.equal(items.length,4);
  assert.deepEqual(fourWeekFlow([]).map(w=>w.income),[0,0,0,0]);
});
