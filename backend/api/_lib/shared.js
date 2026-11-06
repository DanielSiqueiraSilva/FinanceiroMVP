import { exigirUsuario, configurarCors, responderErro, validarId } from './supabase.js';

const BASE = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const TOKEN = /^Bearer\s+(\S+)$/i;

export function fail(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export const sharedId = validarId;

export async function initialize(req, res) {
  configurarCors(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return null; }
  const userId = await exigirUsuario(req);
  const token = TOKEN.exec(String(req.headers.authorization || ''))?.[1];
  if (!BASE || !PUBLIC_KEY || !token) throw fail('Serviço indisponível.', 503);
  return { userId, token };
}

/**
 * PostgREST com JWT do usuário, nunca service_role.
 * Todas as operações usam RLS no banco e as RPCs fazem verificações atômicas.
 */
export async function queryShared(token, path, method = 'GET', body) {
  if (!BASE || !PUBLIC_KEY) throw fail('Banco não configurado.', 503);
  const response = await fetch(BASE + '/rest/v1/' + path, {
    method,
    signal: AbortSignal.timeout(12000),
    headers: {
      apikey: PUBLIC_KEY,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(method !== 'GET' ? { Prefer: 'return=representation' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const content = await response.text();
  let parsed = null;
  try { parsed = content ? JSON.parse(content) : null; }
  catch { throw fail('Resposta inesperada do banco.', 502); }
  if (!response.ok) {
    const code = parsed?.code;
    if (response.status === 401 || code === 'PGRST301') throw fail('Sessão expirada.', 401);
    if (response.status === 403 || code === '42501') throw fail('Você não possui permissão para esta operação.', 403);
    if (code === '23505') throw fail('Este registro já existe.', 409);
    if (code === '23503') throw fail('O registro relacionado não existe.', 400);
    if (code === '23514' || code === '22023') throw fail('Dados inválidos ou limite de operação atingido.', 400);
    console.error('[shared-wallets] PostgREST error', response.status, code || '');
    throw fail(response.status === 404 ? 'Registro não encontrado.' : 'Não foi possível concluir a operação.', 502);
  }
  return parsed;
}

export function validateText(value, max, label, min = 1) {
  if (typeof value !== 'string') throw fail('Informe ' + label + '.');
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw fail(label + ': use de ' + min + ' a ' + max + ' caracteres.');
  return trimmed;
}
export function validateOptional(value, max) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.trim().length > max) throw fail('Descrição inválida.');
  return value.trim();
}
export function validateTransaction(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail('Dados inválidos.');
  const type = value.type;
  if (type !== 'receita' && type !== 'despesa') throw fail('Tipo inválido.');
  const amount = Number(value.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) throw fail('Valor inválido.');
  const category = validateText(value.category, 60, 'categoria');
  const description = validateText(value.description, 120, 'descrição');
  const date = String(value.entry_date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail('Data inválida.');
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 2000 || y > 2100 || dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) {
    throw fail('Data inexistente.');
  }
  return { type, amount: Number(amount.toFixed(2)), category, description, entry_date: date };
}
export function sendError(res, error) { return responderErro(res, error); }
export function readUUID(value) { return sharedId(value); }
