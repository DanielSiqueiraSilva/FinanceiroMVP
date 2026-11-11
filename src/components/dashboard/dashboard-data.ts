import type { Lancamento } from '../../types/finance';
import type { PlannerData } from '../../services/finance-planner';

export type SpendingCategory = { categoria: string; valor: number; percentual: number };

/** Pure selectors: do not write to the bank, transaction list or planner data. */
export function categorySpending(items: readonly Lancamento[]): SpendingCategory[] {
  const expenses = items.filter(item => item.tipo === 'despesa');
  const totals = expenses.reduce<Record<string, number>>((result, item) => ({
    ...result, [item.categoria]: (result[item.categoria] ?? 0) + Number(item.valor),
  }), {});
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return Object.entries(totals).map(([categoria, valor]) => ({
    categoria, valor, percentual: total > 0 ? 100 * valor / total : 0,
  })).sort((a, b) => b.valor - a.valor || a.categoria.localeCompare(b.categoria, 'pt-BR'));
}

export function latestTransactions(items: readonly Lancamento[], count = 5): Lancamento[] {
  return [...items].sort((a, b) => b.data.localeCompare(a.data) ||
    (b.created_at ?? '').localeCompare(a.created_at ?? '') ||
    a.id.localeCompare(b.id)).slice(0, Math.max(0, count));
}

export function plannerBalances(planner: PlannerData | null) {
  if (!planner) return {
    accountTotal: null as number | null, cardPending: null as number | null,
    hasAccounts: false, hasCards: false,
  };
  const hasAccounts = planner.accounts.length > 0;
  const hasCards = planner.cards.length > 0;
  return {
    accountTotal: hasAccounts && planner.accountOverview.length
      ? planner.accountOverview.reduce((sum, a) => sum + Number(a.estimated_balance), 0)
      : null,
    cardPending: hasCards && planner.cardOverview.length
      ? planner.cardOverview.reduce((sum, c) => sum + Number(c.unpaid_total), 0)
      : null,
    hasAccounts, hasCards,
  };
}

/** The HTML prototype's four visual weeks, using *recorded* transactions only. */
export function fourWeekFlow(items: readonly Lancamento[]) {
  const weeks = Array.from({ length: 4 }, (_, i) => ({ index: i, income: 0, expense: 0 }));
  for (const tx of items) {
    const day = Number(tx.data.slice(8, 10));
    const value = Number(tx.valor);
    if (!Number.isFinite(day) || day < 1 || day > 31 ||
        !Number.isFinite(value) || value < 0) continue;
    const bucket = Math.min(3, Math.floor((day - 1) / 8));
    if (tx.tipo === 'receita') weeks[bucket].income += value;
    else if (tx.tipo === 'despesa') weeks[bucket].expense += value;
  }
  return weeks;
}

