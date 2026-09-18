import {
  configurarCors,
  responderErro,
  supabaseRequest,
  validarPeriodo,
} from './_lib/supabase.js';

export default async function handler(req, res) {
  configurarCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,OPTIONS');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const { mes, ano, inicio, fim } = validarPeriodo(req.query);
    const params = new URLSearchParams({ select: 'tipo,valor' });
    params.append('data', `gte.${inicio}`);
    params.append('data', `lt.${fim}`);

    const lancamentos = (await supabaseRequest(`lancamentos?${params.toString()}`)) ?? [];

    const totais = lancamentos.reduce(
      (acc, item) => {
        const valor = Number(item.valor) || 0;
        if (item.tipo === 'receita') acc.totalReceitas += valor;
        if (item.tipo === 'despesa') acc.totalDespesas += valor;
        return acc;
      },
      { totalReceitas: 0, totalDespesas: 0 }
    );

    return res.status(200).json({
      saldo: Number((totais.totalReceitas - totais.totalDespesas).toFixed(2)),
      totalReceitas: Number(totais.totalReceitas.toFixed(2)),
      totalDespesas: Number(totais.totalDespesas.toFixed(2)),
      quantidadeLancamentos: lancamentos.length,
      mes,
      ano,
    });
  } catch (error) {
    return responderErro(res, error);
  }
}
