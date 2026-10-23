import { configurarCors, exigirUsuario, responderErro, supabaseRequest, validarPeriodo } from './_lib/supabase.js';

export default async function handler(req, res) {
  configurarCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const userId = await exigirUsuario(req);
    if (req.method === 'GET') {
      const { mes, ano } = validarPeriodo(req.query);
      const params = new URLSearchParams({ select: 'mes,ano,valor' });
      params.append('user_id', `eq.${userId}`);
      params.append('mes', `eq.${mes}`);
      params.append('ano', `eq.${ano}`);
      const data = await supabaseRequest(`limites_mensais?${params}`);
      return res.status(200).json(data?.[0] ?? { mes, ano, valor: 0 });
    }
    if (req.method === 'PUT') {
      const { mes, ano } = validarPeriodo(req.body);
      const valor = Number(req.body?.valor);
      if (!Number.isFinite(valor) || valor < 0) {
        return res.status(400).json({ error: 'Informe um limite maior ou igual a zero.' });
      }
      const params = new URLSearchParams({ on_conflict: 'user_id,mes,ano' });
      const data = await supabaseRequest(`limites_mensais?${params}`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ user_id: userId, mes, ano, valor: Number(valor.toFixed(2)), updated_at: new Date().toISOString() }),
      });
      return res.status(200).json(data?.[0] ?? { mes, ano, valor });
    }
    res.setHeader('Allow', 'GET,PUT,OPTIONS');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) { return responderErro(res, error); }
}
