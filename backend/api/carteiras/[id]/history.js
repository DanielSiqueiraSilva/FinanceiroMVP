import { initialize, queryShared, fail, readUUID, sendError } from '../../_lib/shared.js';

export default async function handler(req, res) {
  try {
    const auth = await initialize(req, res);
    if (!auth) return;
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET,OPTIONS');
      return res.status(405).json({ error: 'Método não permitido.' });
    }
    const id = readUUID(req.query?.id);
    const kind = String(req.query?.kind || '');
    if (kind !== 'messages' && kind !== 'transactions') throw fail('Histórico inválido.');
    const before = String(req.query?.before || '');
    const parsed = new Date(before);
    if (!before || Number.isNaN(parsed.valueOf())) throw fail('Data do cursor inválida.');
    const table = kind === 'messages' ? 'shared_wallet_messages' : 'shared_wallet_transactions';
    const params = new URLSearchParams({
      select: '*', wallet_id: 'eq.' + id,
      created_at: 'lt.' + parsed.toISOString(),
      order: 'created_at.desc', limit: '80',
    });
    const rows = await queryShared(auth.token, table + '?' + params.toString());
    return res.status(200).json(kind === 'messages' ? (rows ?? []).reverse() : rows ?? []);
  } catch (error) { return sendError(res, error); }
}
