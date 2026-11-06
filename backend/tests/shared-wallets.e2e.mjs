/**
 * Teste INTEGRADO com 2 contas de TESTE reais, sem mocks.
 * NUNCA roda automaticamente no CI; exige secrets no ambiente e URL de
 * preview (não produção). Limpa a carteira temporária no finally.
 *
 * Executar da raiz após configurar secrets protegidos:
 * node backend/tests/shared-wallets.e2e.mjs
 */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const TEST_PROJECT = 'jznjlyenngbvgbrnrkzc';
const url = process.env.TEST_SUPABASE_URL;
const publishable = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
const backend = process.env.TEST_BACKEND_URL?.replace(/\/+$/, '');
const aEmail = process.env.TEST_USER_A_EMAIL;
const bEmail = process.env.TEST_USER_B_EMAIL;
const aPassword = process.env.TEST_USER_A_PASSWORD;
const bPassword = process.env.TEST_USER_B_PASSWORD;

if (!url || !url.startsWith('https://' + TEST_PROJECT + '.supabase.co') ||
    !publishable || !backend || !aEmail || !bEmail || !aPassword || !bPassword) {
  throw new Error('Configurar as variáveis TEST_* no ambiente privado. Somente FinanApp-TESTE é permitido.');
}
const backendUrl = new URL(backend);
if (backendUrl.protocol !== 'https:' && backendUrl.hostname !== 'localhost') {
  throw new Error('A API de teste deve usar HTTPS.');
}
if (['financeiro-mvp-1283.vercel.app','financeiro-mvp.vercel.app',
     'financeiro-mvp-web.vercel.app'].includes(backendUrl.hostname)) {
  throw new Error('Não executar testes destrutivos em endpoints de produção.');
}

function client() {
  return createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error('Conta de teste inválida: ' + (error?.message || 'sem sessão'));
  return data.session.access_token;
}

async function request(token, endpoint, method = 'GET', body) {
  const response = await fetch(backend + '/api/carteiras' + endpoint, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const content = await response.json().catch(() => null);
  return { status: response.status, body: content };
}
async function ok(token, endpoint, method = 'GET', body) {
  const result = await request(token, endpoint, method, body);
  assert.ok(result.status >= 200 && result.status < 300,
    endpoint + ': esperado sucesso, recebido ' + result.status + ': ' + JSON.stringify(result.body));
  return result.body;
}
function waitForChat(supabase, token, walletId, expectedText) {
  return new Promise(async (resolve, reject) => {
    let done = false;
    const channel = supabase.channel('shared-wallet-' + walletId, { config: { private: true } })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'shared_wallet_messages',
        filter: 'wallet_id=eq.' + walletId,
      }, payload => {
        if (payload.new?.body === expectedText && !done) {
          done = true; clearTimeout(timer);
          void supabase.removeChannel(channel);
          resolve(payload.new);
        }
      });
    const timer = setTimeout(() => {
      if (done) return;
      done = true; void supabase.removeChannel(channel);
      reject(new Error('Mensagem não chegou por Realtime em 20 segundos.'));
    }, 20000);
    try {
      await supabase.realtime.setAuth(token);
      channel.subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (done) return;
          done = true; clearTimeout(timer);
          void supabase.removeChannel(channel);
          reject(new Error('Falha no canal privado Realtime: ' + status));
        }
      });
    } catch (error) {
      if (done) return;
      done = true; clearTimeout(timer);
      void supabase.removeChannel(channel);
      reject(error);
    }
  });
}

const a = client(), b = client();
let walletId = null;
try {
  const [tokenA, tokenB] = await Promise.all([
    signIn(a, aEmail, aPassword),
    signIn(b, bEmail, bPassword),
  ]);
  assert.notEqual(aEmail.toLowerCase(), bEmail.toLowerCase(), 'Usar duas contas distintas.');
  console.log('1/7 Criando carteira com a conta A no Supabase de TESTE...');
  const wallet = await ok(tokenA, '', 'POST', {
    name: 'Teste Casa ' + Date.now(), description: 'Carteira de teste de integração',
  });
  walletId = wallet.id;
  assert.ok(walletId);

  console.log('2/7 Conferindo que B não tem acesso antes do convite...');
  const denied = await request(tokenB, '/' + walletId);
  assert.ok([403,404].includes(denied.status), 'B obteve acesso antes de aceitar o convite.');

  console.log('3/7 Convidando B e aceitando o convite...');
  await ok(tokenA, '/' + walletId + '/actions', 'POST', {
    action: 'invite', email: bEmail,
  });
  const invitations = await ok(tokenB, '');
  const invite = invitations.invitations.find(i => i.wallet_id === walletId);
  assert.ok(invite?.id, 'Convite não chegou na caixa de entrada de B.');
  await ok(tokenB, '', 'POST', { action: 'respond', invitation_id: invite.id, accept: true });

  console.log('4/7 Criando despesa e validando saldo na conta B...');
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Sao_Paulo',
  }).format(now);
  const tx = await ok(tokenA, '/' + walletId + '/actions', 'POST', {
    action: 'create_transaction', transaction: {
      type: 'despesa', amount: 80, category: 'Casa',
      description: 'Conta compartilhada de teste', entry_date: date,
    },
  });
  assert.ok(tx.id);
  const bDetail = await ok(tokenB, '/' + walletId);
  assert.ok(bDetail.transactions.some(item => item.id === tx.id));
  assert.equal(Number(bDetail.totals.total_despesas), 80);

  console.log('5/7 Recebendo mensagem de B no Realtime de A...');
  const marker = 'Mensagem teste real ' + Date.now();
  const realtimeReceived = waitForChat(a, tokenA, walletId, marker);
  // Espera a autorização do canal antes de enviar, para validar a entrega.
  await new Promise(resolve => setTimeout(resolve, 1500));
  await ok(tokenB, '/' + walletId + '/actions', 'POST', { action:'send_message', body:marker });
  await realtimeReceived;
  const persisted = await ok(tokenA, '/' + walletId);
  assert.ok(persisted.messages.some(message => message.body === marker));

  console.log('6/7 Removendo B e confirmando a revogação do mesmo JWT...');
  await ok(tokenA, '/' + walletId + '/actions', 'POST', {
    action:'remove_member', user_id:bDetail.members.find(m => m.role === 'member')?.user_id,
    confirmation:'REMOVER',
  });
  const afterRemoval = await request(tokenB, '/' + walletId);
  assert.ok([403,404].includes(afterRemoval.status), 'B ainda acessa dados depois da remoção.');
  const afterMessage = await request(tokenB, '/' + walletId + '/actions', 'POST', {
    action:'send_message', body:'Tentativa após remoção',
  });
  assert.ok(afterMessage.status >= 400, 'B enviou mensagem após a remoção.');

  console.log('7/7 Verificando que A ainda possui acesso antes do encerramento...');
  const final = await ok(tokenA, '/' + walletId);
  assert.equal(final.wallet.id, walletId);
  console.log('TESTE INTEGRADO APROVADO para os cenários exercitados.');
} finally {
  if (walletId) {
    try {
      const data = await a.auth.getSession();
      if (data.data.session?.access_token) {
        await ok(data.data.session.access_token, '/' + walletId, 'DELETE', { confirmation:'ENCERRAR' });
        console.log('Carteira temporária encerrada.');
      }
    } catch {
      console.error('ATENÇÃO: não foi possível encerrar automaticamente a carteira temporária ' + walletId);
    }
  }
  await Promise.all([a.auth.signOut(),b.auth.signOut()]);
}
