export type TipoLancamento = 'receita' | 'despesa';

export interface Lancamento {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  tipo: TipoLancamento;
  created_at?: string;
  updated_at?: string;
}

export interface LancamentoInput {
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  tipo: TipoLancamento;
}

export interface ResumoFinanceiro {
  saldo: number;
  totalReceitas: number;
  totalDespesas: number;
  quantidadeLancamentos: number;
  mes: number;
  ano: number;
}
