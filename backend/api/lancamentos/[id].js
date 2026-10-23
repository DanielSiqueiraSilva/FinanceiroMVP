import { configurarCors, exigirUsuario, responderErro, supabaseRequest, validarId, validarLancamento } from '../_lib/supabase.js';

export default async function handler(req, res) {
  configurarCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const userId = await exigirUsuario(req);
    const id = validarId(req.query?.id);
    const params = new URLSearchParams();
    params.append('id', `eq.${id}`);
    params.append('user_id', `eq.${userId}`); // bloqueia leitura, edição e exclusão de outra conta
    if (req.method === 'GET') {
      const data = await supabaseRequest(`lancamentos?select=*&${params}`);
      if (!data?.length) return res.status(404).json({ error: 'Lançamento não encontrado.' });
      return res.status(200).json(data[0]);
    }
    if (req.method === 'PUT') {
      const fields = validarLancamento(req.body);
      const data = await supabaseRequest(`lancamentos?${params}`, {
        method: 'PATCH', body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
      });
      if (!data?.length) return res.status(404).json({ error: 'Lançamento não encontrado.' });
      return res.status(200).json(data[0]);
    }
    if (req.method === 'DELETE') {
      const data = await supabaseRequest(`lancamentos?${params}`, { method: 'DELETE' });
      if (!data?.length) return res.status(404).json({ error: 'Lançamento não encontrado.' });
      return res.status(200).json({ success: true });
    }
    res.setHeader('Allow', 'GET,PUT,DELETE,OPTIONS');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) { return responderErro(res, error); }
}
