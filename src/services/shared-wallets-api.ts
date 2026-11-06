import { supabaseAuth } from '../auth/supabaseClient';

const BASE = process.env.EXPO_PUBLIC_FINANCE_API_URL?.replace(/\/+$/, '');

export type SharedWallet = {
  id: string; owner_id: string; name: string; description: string;
  created_at: string; updated_at: string;
};
export type WalletMember = {
  wallet_id: string; user_id: string; display_name: string;
  role: 'owner' | 'member'; joined_at: string;
};
export type WalletInvitation = {
  id: string; wallet_id: string; wallet_name: string;
  invited_by_name: string; created_at: string; expires_at: string;
  status: 'pending' | 'accepted' | 'declined';
};
export type WalletTransactionInput = {
  type: 'receita' | 'despesa';
  amount: number; category: string; description: string; entry_date: string;
};
export type WalletTransaction = WalletTransactionInput & {
  id: string; wallet_id: string;
  created_by: string | null; created_by_name: string;
  updated_by: string | null; updated_by_name: string;
  created_at: string; updated_at: string;
};
export type WalletMessage = {
  id: string; wallet_id: string; sender_id: string | null;
  sender_name: string; body: string; created_at: string;
};
export type WalletRead = { wallet_id: string; user_id: string; last_read_at: string };
export type WalletUnread = { wallet_id: string; unread: number };
export type WalletListResponse = {
  wallets: SharedWallet[]; invitations: WalletInvitation[]; unreadCounts: WalletUnread[];
};
export type WalletDetailsResponse = {
  wallet: SharedWallet; members: WalletMember[]; transactions: WalletTransaction[];
  messages: WalletMessage[]; reads: WalletRead[];
  invitations: { id: string; invited_user_id: string; status: string; created_at: string; expires_at: string }[];
};

async function requestShared<T>(path: string, method = 'GET', body?: object): Promise<T> {
  if (!BASE) throw new Error('A URL da API financeira não está configurada.');
  const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();
  if (sessionError || !session?.access_token) throw new Error('Entre novamente para acessar as carteiras.');
  let res: Response;
  try {
    res = await fetch(BASE + '/api/carteiras' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + session.access_token,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch { throw new Error('Não foi possível conectar às carteiras. Verifique a conexão.'); }
  const result: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const text = result && typeof result === 'object' && 'error' in result &&
      typeof result.error === 'string' ? result.error : 'Erro de acesso às carteiras (' + res.status + ').';
    throw new Error(text);
  }
  return result as T;
}
export const listSharedWallets = () => requestShared<WalletListResponse>('');
export const createSharedWallet = (name: string, description: string) =>
  requestShared<SharedWallet>('', 'POST', { action: 'create', name, description });
export const respondSharedInvite = (invitation_id: string, accept: boolean) =>
  requestShared<{ success: boolean }>('', 'POST', { action: 'respond', invitation_id, accept });
export const getSharedWallet = (id: string) =>
  requestShared<WalletDetailsResponse>('/' + encodeURIComponent(id));
export const updateSharedWallet = (id: string, name: string, description: string) =>
  requestShared<SharedWallet>('/' + encodeURIComponent(id), 'PATCH', { name, description });
export const closeSharedWallet = (id: string) =>
  requestShared<{ success: boolean }>('/' + encodeURIComponent(id), 'DELETE', { confirmation: 'ENCERRAR' });
export const walletAction = <T,>(id: string, action: string, args: object = {}) =>
  requestShared<T>('/' + encodeURIComponent(id) + '/actions', 'POST', { action, ...args });
