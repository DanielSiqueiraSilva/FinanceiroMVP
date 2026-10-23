import { configurarCors, exigirUsuario, responderErro, supabaseRequest, validarPeriodo } from './_lib/supabase.js';

export default async function handler(req, res) {
  configurarCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const userId = await exigirUsuario(req);
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET,OPTIONS');
      return res.status(405).json({ error: 'Método não permitido.' });
    }
    const { mes, ano, inicio, fim } = validarPeriodo(req.query);
    const params = new URLSearchParams({ select: 'tipo,valor' });
    params.append('user_id', `eq.${userId}`);
    params.append('data', `gte.${inicio}`);
    params.append('data', `lt.${fim}`);
    const lista = await supabaseRequest(`lancamentos?${params}`);
    const totalReceitas = lista.reduce((s, x) => s + (x.tipo === 'receita' ? Number(x.valor) : 0), 0);
    const totalDespesas = lista.reduce((s, x) => s + (x.tipo === 'despesa' ? Number(x.valor) : 0), 0);
    return res.status(200).json({
      saldo: Number((totalReceitas - totalDespesas).toFixed(2)),
      totalReceitas: Number(totalReceitas.toFixed(2)),
      totalDespesas: Number(totalDespesas.toFixed(2)),
      quantidadeLancamentos: lista.length,
      mes, ano,
    });
  } catch (error) { return responderErro(res, error); }
}
