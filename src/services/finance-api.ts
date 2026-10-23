import { supabaseAuth } from '../auth/supabaseClient';
import type { Lancamento, LancamentoInput, ResumoFinanceiro } from '../types/finance';

const BASE = process.env.EXPO_PUBLIC_FINANCE_API_URL?.replace(/\/$/, '');

interface LimiteMensal { mes: number; ano: number; valor: number }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!BASE) throw new Error('Configure EXPO_PUBLIC_FINANCE_API_URL.');
  const { data: { session }, error } = await supabaseAuth.auth.getSession();
  if (error || !session?.access_token) throw new Error('Sua sessão terminou. Entre novamente.');
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new Error('Não foi possível conectar à API financeira.');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      // Desmonta a tela financeira imediatamente se a API recusar o token.
      await supabaseAuth.auth.signOut({ scope: 'local' });
      throw new Error('Sessão inválida ou expirada. Entre novamente.');
    }
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error : `Erro na API (${response.status}).`;
    throw new Error(message);
  }
  return body as T;
}

export const listarLancamentos = (mes: number, ano: number) => request<Lancamento[]>(`/api/lancamentos?mes=${mes}&ano=${ano}`);
export const buscarLancamento = (id: string) => request<Lancamento>(`/api/lancamentos/${encodeURIComponent(id)}`);
export const criarLancamento = (input: LancamentoInput) => request<Lancamento>('/api/lancamentos', { method: 'POST', body: JSON.stringify(input) });
export const atualizarLancamento = (id: string, input: LancamentoInput) => request<Lancamento>(`/api/lancamentos/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
export const excluirLancamento = (id: string) => request<{ success: true }>(`/api/lancamentos/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const buscarResumo = (mes: number, ano: number) => request<ResumoFinanceiro>(`/api/resumo?mes=${mes}&ano=${ano}`);
export const buscarLimite = (mes: number, ano: number) => request<LimiteMensal>(`/api/limite?mes=${mes}&ano=${ano}`);
export const salvarLimite = (mes: number, ano: number, valor: number) => request<LimiteMensal>('/api/limite', { method: 'PUT', body: JSON.stringify({ mes, ano, valor }) });
