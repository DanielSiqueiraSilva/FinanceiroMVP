import test from 'node:test';
import assert from 'node:assert/strict';
import { validateText, validateOptional, validateTransaction, readUUID } from '../api/_lib/shared.js';

test('carteira: nome válido e tamanho limitado', () => {
  assert.equal(validateText(' Casa ', 80, 'nome', 2), 'Casa');
  assert.throws(() => validateText('X', 80, 'nome', 2));
  assert.throws(() => validateText('A'.repeat(81), 80, 'nome', 2));
  assert.equal(validateOptional('  apartamento  ', 300), 'apartamento');
  assert.throws(() => validateOptional('a'.repeat(301), 300));
});

test('carteira: rejeita IDs que não são UUIDs', () => {
  assert.equal(readUUID('8cfab6ba-6033-4d35-827e-2854b57ff502'),
    '8cfab6ba-6033-4d35-827e-2854b57ff502');
  assert.throws(() => readUUID('1;drop table'));
  assert.throws(() => readUUID('../../segredos'));
});

test('lançamento compartilhado: valida campos e arredondamento', () => {
  const data = { type: 'despesa', amount: 80.125, category: 'Casa',
    description: 'Conta de água', entry_date: '2026-11-28' };
  const result = validateTransaction(data);
  assert.equal(result.amount, 80.13);
  assert.equal(result.description, 'Conta de água');
  assert.throws(() => validateTransaction({ ...data, amount: -5 }));
  assert.throws(() => validateTransaction({ ...data, amount: 0 }));
  assert.throws(() => validateTransaction({ ...data, amount: 100000001 }));
  assert.throws(() => validateTransaction({ ...data, type: 'unknown' }));
  assert.throws(() => validateTransaction({ ...data, description: 'x'.repeat(121) }));
  assert.throws(() => validateTransaction({ ...data, entry_date: '2026-02-30' }));
  assert.throws(() => validateTransaction({ ...data, entry_date: '2026-13-10' }));
  assert.throws(() => validateTransaction({ ...data, entry_date: '2026-11-00' }));
});

test('chat: mensagens vazias e acima do limite são rejeitadas pela validação', () => {
  assert.equal(validateText('  Olá, casa  ', 1200, 'mensagem'), 'Olá, casa');
  assert.throws(() => validateText('  ', 1200, 'mensagem'));
  assert.throws(() => validateText('a'.repeat(1201), 1200, 'mensagem'));
});
