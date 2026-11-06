import { initialize, queryShared, fail, validateText, validateOptional, readUUID, sendError } from '../_lib/shared.js';

export default async function handler(req, res) {
  try {
    const auth = await initialize(req, res);
    if (!auth) return;
    const { token, userId } = auth;
    if (req.method === 'GET') {
      const [wallets, invitations, unreadCounts] = await Promise.all([
        queryShared(token, 'shared_wallets?select=*&order=created_at.desc&limit=100'),
        queryShared(token, 'rpc/shared_wallet_inbox', 'POST', {}),
        queryShared(token, 'rpc/shared_wallet_unread_counts', 'POST', {}),
      ]);
      return res.status(200).json({ wallets, invitations, unreadCounts });
    }
    if (req.method === 'POST') {
      const action = String(req.body?.action || 'create');
      if (action === 'create') {
        const name = validateText(req.body?.name, 80, 'nome da carteira', 2);
        const description = validateOptional(req.body?.description, 300);
        const wallets = await queryShared(token, 'shared_wallets', 'POST', {
          owner_id: userId, name, description,
        });
        return res.status(201).json(wallets?.[0] ?? null);
      }
      if (action === 'respond') {
        const invitation = readUUID(req.body?.invitation_id);
        if (typeof req.body?.accept !== 'boolean') throw fail('Resposta inválida.');
        const result = await queryShared(token, 'rpc/shared_wallet_respond', 'POST', {
          p_invite: invitation, p_accept: req.body.accept,
        });
        return res.status(200).json({ success: result === true });
      }
      throw fail('Ação desconhecida.');
    }
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) { return sendError(res, error); }
}
