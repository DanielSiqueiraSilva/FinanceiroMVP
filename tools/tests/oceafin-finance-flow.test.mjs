import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_FINANCE_AMOUNT, parseBRLInput, positiveAmount,
  validateTransfer, validateCardPayment, validateLinkChoice,
} from '../../src/components/workspace/finance-flow-validation.ts';

const accounts = [{ id:'bank',active:true },{ id:'wallet',active:true },{ id:'old',active:false }];
const cards = [{ id:'card',active:true },{ id:'archived',active:false }];
const balances = [{card_id:'card',unpaid_total:120.45}];

test('parse monetary amounts exactly as entered in Brazilian notation', () => {
  assert.equal(parseBRLInput('R$ 1.234,56'),1234.56);
  assert.equal(parseBRLInput('1.234'),1234);
  assert.equal(parseBRLInput('12,5'),12.5);
  assert.equal(parseBRLInput('1234.56'),1234.56);
  assert.equal(parseBRLInput('-30,25'),-30.25);
  assert.equal(parseBRLInput('0'),0);
  for (const v of ['', '1,234', '1,2,3', '1.23.45', 'Infinity','NaN','1e5',
    '1000000000000','-1000000000000']) assert.equal(parseBRLInput(v),null,v);
  assert.equal(MAX_FINANCE_AMOUNT,999999999999);
});

test('transfer requires distinct active accounts and positive amount', () => {
  assert.equal(validateTransfer('bank','wallet',200,accounts),null);
  assert.match(validateTransfer('bank','bank',200,accounts),/diferentes/);
  assert.match(validateTransfer('bank','old',200,accounts),/ativas/);
  assert.match(validateTransfer('bank','wallet',0,accounts),/maior/);
  assert.equal(positiveAmount('-12,00'),null);
  assert.equal(positiveAmount('22,00'),22);
});

test('card settlement is limited to registered pending purchases', () => {
  assert.equal(validateCardPayment('card','bank',120.45,accounts,cards,balances),null);
  assert.match(validateCardPayment('card','bank',120.46,accounts,cards,balances),/maior/);
  assert.match(validateCardPayment('archived','bank',20,accounts,cards,balances),/ativo/);
  assert.match(validateCardPayment('card','old',20,accounts,cards,balances),/ativa/);
  assert.match(validateCardPayment('card','bank',20,accounts,cards,[]),/indisponível/);
});

test('no card link on income and no archived account/card links', () => {
  assert.equal(validateLinkChoice('despesa','card:card',accounts,cards),null);
  assert.match(validateLinkChoice('receita','card:card',accounts,cards),/Receitas/);
  assert.match(validateLinkChoice('despesa','card:archived',accounts,cards),/ativo/);
  assert.match(validateLinkChoice('receita','account:old',accounts,cards),/ativa/);
  assert.equal(validateLinkChoice('receita','account:bank',accounts,cards),null);
  assert.equal(validateLinkChoice('receita','',accounts,cards),null);
});
