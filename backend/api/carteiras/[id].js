import { initialize, queryShared, fail, validateText, validateOptional, readUUID, sendError } from '../_lib/shared.js';

export default async function handler(req, res) {
  try {
    const auth = await initialize(req, res);
    if (!auth) return;
    const { token } = auth;
    const id = readUUID(req.query?.id);
    const filter = encodeURIComponent(id);
    if (req.method === 'GET') {
      const wallets = await queryShared(token, 'shared_wallets?select=*&id=eq.' + filter);
      if (!wallets?.length) return res.status(404).json({ error: 'Carteira não encontrada ou acesso revogado.' });
      const [members, transactions, messages, reads, invitations] = await Promise.all([
        queryShared(token, 'shared_wallet_members?select=*&wallet_id=eq.' + filter + '&order=joined_at.asc'),
        queryShared(token, 'shared_wallet_transactions?select=*&wallet_id=eq.' + filter + '&order=entry_date.desc,created_at.desc&limit=300'),
        queryShared(token, 'shared_wallet_messages?select=*&wallet_id=eq.' + filter + '&order=created_at.desc&limit=100'),
        queryShared(token, 'shared_wallet_message_reads?select=*&wallet_id=eq.' + filter),
        queryShared(token, 'shared_wallet_invitations?select=id,invited_user_id,status,created_at,expires_at&wallet_id=eq.' + filter),
      ]);
      return res.status(200).json({
        wallet: wallets[0], members, transactions,
        messages: (messages ?? []).reverse(), reads, invitations,
      });
    }
    if (req.method === 'PATCH') {
      const name = validateText(req.body?.name, 80, 'nome da carteira', 2);
      const description = validateOptional(req.body?.description, 300);
      const changed = await queryShared(token, 'shared_wallets?id=eq.' + filter, 'PATCH', { name, description });
      if (!changed?.length) return res.status(403).json({ error: 'Apenas o proprietário pode editar.' });
      return res.status(200).json(changed[0]);
    }
    if (req.method === 'DELETE') {
      if (req.body?.confirmation !== 'ENCERRAR') throw fail('Digite ENCERRAR para confirmar o encerramento.');
      const deleted = await queryShared(token, 'shared_wallets?id=eq.' + filter, 'DELETE');
      if (!deleted?.length) return res.status(403).json({ error: 'Apenas o proprietário pode encerrar a carteira.' });
      return res.status(200).json({ success: true });
    }
    res.setHeader('Allow', 'GET,PATCH,DELETE,OPTIONS');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) { return sendError(res, error); }
}
