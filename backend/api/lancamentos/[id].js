import {
  configurarCors,
  responderErro,
  supabaseRequest,
  validarLancamento,
} from '../_lib/supabase.js';

export default async function handler(req, res) {
  configurarCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const id = String(req.query.id || '');

  if (!id) {
    return res.status(400).json({ error: 'ID do lançamento não informado.' });
  }

  try {
    if (req.method === 'GET') {
      const params = new URLSearchParams({ select: '*' });
      params.append('id', `eq.${id}`);
      const data = await supabaseRequest(`lancamentos?${params.toString()}`);

      if (!data?.length) {
        return res.status(404).json({ error: 'Lançamento não encontrado.' });
      }

      return res.status(200).json(data[0]);
    }

    if (req.method === 'PUT') {
      const lancamento = validarLancamento(req.body);
      const params = new URLSearchParams();
      params.append('id', `eq.${id}`);

      const data = await supabaseRequest(`lancamentos?${params.toString()}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...lancamento, updated_at: new Date().toISOString() }),
      });

      if (!data?.length) {
        return res.status(404).json({ error: 'Lançamento não encontrado.' });
      }

      return res.status(200).json(data[0]);
    }

    if (req.method === 'DELETE') {
      const params = new URLSearchParams();
      params.append('id', `eq.${id}`);
      const data = await supabaseRequest(`lancamentos?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!data?.length) {
        return res.status(404).json({ error: 'Lançamento não encontrado.' });
      }

      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET,PUT,DELETE,OPTIONS');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    return responderErro(res, error);
  }
}
