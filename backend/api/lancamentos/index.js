import { configurarCors, exigirUsuario, responderErro, supabaseRequest, validarLancamento, validarPeriodo } from '../_lib/supabase.js';

export default async function handler(req, res) {
  configurarCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const userId = await exigirUsuario(req);
    if (req.method === 'GET') {
      const { inicio, fim } = validarPeriodo(req.query);
      const params = new URLSearchParams({ select: '*', order: 'data.desc,created_at.desc' });
      params.append('user_id', `eq.${userId}`);
      params.append('data', `gte.${inicio}`);
      params.append('data', `lt.${fim}`);
      const data = await supabaseRequest(`lancamentos?${params}`);
      return res.status(200).json(data ?? []);
    }
    if (req.method === 'POST') {
      const fields = validarLancamento(req.body);
      const data = await supabaseRequest('lancamentos', {
        method: 'POST',
        body: JSON.stringify({ ...fields, user_id: userId }),
      });
      return res.status(201).json(data?.[0] ?? data);
    }
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) { return responderErro(res, error); }
}
