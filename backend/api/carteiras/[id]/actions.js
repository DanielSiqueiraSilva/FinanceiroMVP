import { initialize, queryShared, fail, validateText, validateTransaction, readUUID, sendError } from '../../_lib/shared.js';

export default async function handler(req, res) {
  try {
    const auth = await initialize(req, res);
    if (!auth) return;
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST,OPTIONS');
      return res.status(405).json({ error: 'Método não permitido.' });
    }
    const { token, userId } = auth;
    const id = readUUID(req.query?.id);
    const wallet = encodeURIComponent(id);
    const action = String(req.body?.action || '');
    if (action === 'invite') {
      const email = validateText(req.body?.email, 254, 'e-mail', 3);
      const result = await queryShared(token, 'rpc/shared_wallet_invite', 'POST', { p_wallet: id, p_email: email });
      return res.status(200).json({ success: !!result });
    }
    if (action === 'leave') {
      const result = await queryShared(token, 'rpc/shared_wallet_leave', 'POST', { p_wallet: id });
      return res.status(200).json({ success: result === true });
    }
    if (action === 'remove_member') {
      const target = readUUID(req.body?.user_id);
      if (req.body?.confirmation !== 'REMOVER') throw fail('Confirme digitando REMOVER.');
      const result = await queryShared(token, 'rpc/shared_wallet_remove_member', 'POST', {
        p_wallet: id, p_user: target,
      });
      return res.status(200).json({ success: result === true });
    }
    if (action === 'create_transaction' || action === 'update_transaction') {
      const data = validateTransaction(req.body?.transaction);
      if (action === 'create_transaction') {
        const inserted = await queryShared(token, 'shared_wallet_transactions', 'POST', {
          wallet_id: id, created_by: userId, updated_by: userId, ...data,
        });
        return res.status(201).json(inserted?.[0] ?? null);
      }
      const transactionId = readUUID(req.body?.transaction_id);
      const updated = await queryShared(token,
        'shared_wallet_transactions?wallet_id=eq.' + wallet + '&id=eq.' + encodeURIComponent(transactionId),
        'PATCH', { ...data, updated_by: userId });
      if (!updated?.length) return res.status(403).json({ error: 'Lançamento não encontrado ou acesso revogado.' });
      return res.status(200).json(updated[0]);
    }
    if (action === 'delete_transaction') {
      const transactionId = readUUID(req.body?.transaction_id);
      const deleted = await queryShared(token,
        'shared_wallet_transactions?wallet_id=eq.' + wallet + '&id=eq.' + encodeURIComponent(transactionId), 'DELETE');
      if (!deleted?.length) return res.status(403).json({ error: 'Lançamento não encontrado ou acesso revogado.' });
      return res.status(200).json({ success: true });
    }
    if (action === 'send_message') {
      const body = validateText(req.body?.body, 1200, 'mensagem');
      const inserted = await queryShared(token, 'shared_wallet_messages', 'POST', {
        wallet_id: id, sender_id: userId, body,
      });
      return res.status(201).json(inserted?.[0] ?? null);
    }
    if (action === 'mark_read') {
      const changed = await queryShared(token,
        'shared_wallet_message_reads?wallet_id=eq.' + wallet + '&user_id=eq.' + encodeURIComponent(userId),
        'PATCH', { last_read_at: new Date().toISOString() });
      if (!changed?.length) return res.status(403).json({ error: 'Você não participa da carteira.' });
      return res.status(200).json({ success: true });
    }
    throw fail('Ação desconhecida.');
  } catch (error) { return sendError(res, error); }
}
