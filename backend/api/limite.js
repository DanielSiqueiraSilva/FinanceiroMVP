import {
  configurarCors,
  responderErro,
  supabaseRequest,
  validarPeriodo,
} from './_lib/supabase.js';

function validarValor(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error('O limite mensal deve ser um número maior ou igual a zero.');
  }
  return Number(numero.toFixed(2));
}

export default async function handler(req, res) {
  configurarCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const { mes, ano } = validarPeriodo(req.query);
      const params = new URLSearchParams({ select: 'mes,ano,valor' });
      params.append('mes', `eq.${mes}`);
      params.append('ano', `eq.${ano}`);

      const data = await supabaseRequest(`limites_mensais?${params.toString()}`);
      return res.status(200).json(data?.[0] ?? { mes, ano, valor: 0 });
    }

    if (req.method === 'PUT') {
      const { mes, ano } = validarPeriodo(req.body ?? {});
      const valor = validarValor(req.body?.valor);

      const data = await supabaseRequest('limites_mensais?on_conflict=mes,ano', {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({ mes, ano, valor, updated_at: new Date().toISOString() }),
      });

      return res.status(200).json(data?.[0] ?? { mes, ano, valor });
    }

    res.setHeader('Allow', 'GET,PUT,OPTIONS');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    return responderErro(res, error);
  }
}
