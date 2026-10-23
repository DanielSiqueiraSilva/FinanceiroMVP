function obterConfiguracao() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Object.assign(new Error('Configuração do banco ausente.'), { status: 503 });
  return { url, key };
}

// Aceita uma lista de domínios separados por vírgula: localhost + produção.
export function configurarCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (allowed.includes('*')) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (origin && allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}

/** Nunca confiar no ID enviado pelo cliente: identifica o usuário com Auth. */
export async function exigirUsuario(req) {
  const header = String(req.headers.authorization || '');
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1];
  if (!token) throw Object.assign(new Error('Entre na sua conta para continuar.'), { status: 401 });
  const { url } = obterConfiguracao();
  const pub = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!pub) throw Object.assign(new Error('Autenticação não configurada no backend.'), { status: 503 });
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: pub, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw Object.assign(new Error('Sessão inválida ou expirada.'), { status: 401 });
  const user = await response.json();
  if (!user?.id || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(user.id)) {
    throw Object.assign(new Error('Identificação de usuário inválida.'), { status: 401 });
  }
  return user.id;
}

/** PostgREST só é chamado pelo backend. O frontend nunca recebe essa chave. */
export async function supabaseRequest(path, options = {}) {
  const { url, key } = obterConfiguracao();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    signal: AbortSignal.timeout(12_000),
    headers: {
      apikey: key,
      ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }),
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; }
  catch { throw Object.assign(new Error(`O banco retornou formato inesperado (HTTP ${response.status}).`), { status: 502 }); }
  if (!response.ok) {
    // Erros do banco não devem vazar estrutura interna / SQL em produção.
    console.error('Supabase HTTP', response.status, body?.code || '');
    throw Object.assign(new Error('Falha ao consultar os dados financeiros.'), { status: 502 });
  }
  return body;
}

export function validarPeriodo(query = {}) {
  const now = new Date();
  const mes = Number(query.mes ?? now.getMonth() + 1);
  const ano = Number(query.ano ?? now.getFullYear());
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    throw Object.assign(new Error('Mês ou ano inválido.'), { status: 400 });
  }
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const fim = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-01`;
  return { mes, ano, inicio, fim };
}

export function validarLancamento(body = {}) {
  const descricao = String(body.descricao ?? '').trim();
  const categoria = String(body.categoria ?? '').trim();
  const data = String(body.data ?? '').trim();
  const tipo = String(body.tipo ?? '').trim();
  const valor = Number(body.valor);
  if (!descricao || descricao.length > 120 || !categoria || categoria.length > 60) throw Object.assign(new Error('Descrição ou categoria inválida.'), { status: 400 });
  if (!Number.isFinite(valor) || valor <= 0) throw Object.assign(new Error('O valor deve ser maior que zero.'), { status: 400 });
  if (!['receita', 'despesa'].includes(tipo)) throw Object.assign(new Error('Tipo inválido.'), { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw Object.assign(new Error('Data inválida.'), { status: 400 });
  const [y, m, d] = data.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw Object.assign(new Error('Data inexistente.'), { status: 400 });
  }
  return { descricao, categoria, data, tipo, valor: Number(valor.toFixed(2)) };
}

export function validarId(id) {
  const value = String(id ?? '');
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) {
    throw Object.assign(new Error('Identificador inválido.'), { status: 400 });
  }
  return value;
}

export function responderErro(res, error) {
  const status = Number(error?.status);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  if (safeStatus === 500) console.error('Backend unexpected error:', error);
  return res.status(safeStatus).json({ error: safeStatus === 500 ? 'Erro interno do servidor.' : error.message });
}
