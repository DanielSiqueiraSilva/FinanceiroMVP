function obterConfiguracao() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL e SUPABASE_SECRET_KEY não foram configuradas no backend.');
  }

  return {
    url: url.replace(/\/$/, ''),
    key,
  };
}

export function configurarCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export async function supabaseRequest(caminho, options = {}) {
  const { url, key } = obterConfiguracao();

  const response = await fetch(`${url}/rest/v1/${caminho}`, {
    ...options,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  const texto = await response.text();
  const body = texto ? JSON.parse(texto) : null;

  if (!response.ok) {
    const mensagem = body?.message || body?.hint || 'Erro ao acessar o banco de dados.';
    const error = new Error(mensagem);
    error.status = response.status;
    throw error;
  }

  return body;
}

export function validarPeriodo(query) {
  const agora = new Date();
  const mes = Number(query.mes ?? agora.getMonth() + 1);
  const ano = Number(query.ano ?? agora.getFullYear());

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error('O mês deve ser um número entre 1 e 12.');
  }

  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    throw new Error('O ano informado é inválido.');
  }

  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const fim = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-01`;

  return { mes, ano, inicio, fim };
}

export function validarLancamento(body) {
  const descricao = String(body?.descricao ?? '').trim();
  const categoria = String(body?.categoria ?? '').trim();
  const data = String(body?.data ?? '').trim();
  const tipo = String(body?.tipo ?? '').trim();
  const valor = Number(body?.valor);

  if (!descricao || !categoria || !data || !tipo || body?.valor === undefined) {
    throw new Error('Descrição, categoria, valor, data e tipo são obrigatórios.');
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error('O valor deve ser um número maior que zero.');
  }

  if (!['receita', 'despesa'].includes(tipo)) {
    throw new Error('O tipo deve ser receita ou despesa.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw new Error('A data deve estar no formato AAAA-MM-DD.');
  }

  const [ano, mes, dia] = data.split('-').map(Number);
  const dataUtc = new Date(Date.UTC(ano, mes - 1, dia));
  const dataExiste =
    dataUtc.getUTCFullYear() === ano &&
    dataUtc.getUTCMonth() === mes - 1 &&
    dataUtc.getUTCDate() === dia;

  if (!dataExiste) {
    throw new Error('A data informada é inválida.');
  }

  return {
    descricao,
    categoria,
    valor: Number(valor.toFixed(2)),
    data,
    tipo,
  };
}

export function responderErro(res, error) {
  const status = Number(error?.status) || 500;
  const mensagem = error instanceof Error ? error.message : 'Erro interno do servidor.';
  res.status(status >= 400 && status < 600 ? status : 500).json({ error: mensagem });
}
