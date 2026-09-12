import { Lancamento, LancamentoInput, ResumoFinanceiro } from '../types/finance';

const API_BASE_URL = process.env.EXPO_PUBLIC_FINANCE_API_URL?.replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('A URL da API financeira não foi configurada. Defina EXPO_PUBLIC_FINANCE_API_URL.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message = body?.error || body?.message || 'Não foi possível concluir a operação.';
      throw new Error(message);
    }

    return body as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Falha de conexão com a API financeira.');
  }
}

export function listarLancamentos(mes: number, ano: number) {
  return request<Lancamento[]>(`/api/lancamentos?mes=${mes}&ano=${ano}`);
}

export function buscarLancamento(id: string) {
  return request<Lancamento>(`/api/lancamentos/${id}`);
}

export function criarLancamento(input: LancamentoInput) {
  return request<Lancamento>('/api/lancamentos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function atualizarLancamento(id: string, input: LancamentoInput) {
  return request<Lancamento>(`/api/lancamentos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function excluirLancamento(id: string) {
  return request<{ success: true }>(`/api/lancamentos/${id}`, {
    method: 'DELETE',
  });
}

export function buscarResumo(mes: number, ano: number) {
  return request<ResumoFinanceiro>(`/api/resumo?mes=${mes}&ano=${ano}`);
}
