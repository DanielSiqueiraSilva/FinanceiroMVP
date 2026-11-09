import { supabaseAuth } from '../auth/supabaseClient';

export type MoneyType = 'receita' | 'despesa';
export type FinanceAccount = {
  id: string; user_id: string; name: string; kind: 'bank' | 'cash' | 'investment';
  opening_balance: number; active: boolean;
};
export type FinanceCard = {
  id: string; user_id: string; name: string; credit_limit: number;
  closing_day: number; due_day: number; active: boolean;
};
export type FinanceGoal = {
  id: string; user_id: string; name: string; target_amount: number;
  saved_initial: number; target_date: string | null; active: boolean;
};
export type GoalContribution = {
  id: string; user_id: string; goal_id: string; amount: number;
  note: string; recorded_at: string;
};
export type FinanceBudget = {
  id: string; user_id: string; year: number; month: number;
  category: string; amount: number;
};
export type RecurringRule = {
  id: string; user_id: string; description: string; category: string;
  kind: MoneyType; amount: number; day_of_month: number;
  start_month: string; end_month: string | null; active: boolean;
  account_id: string | null; card_id: string | null;
};
export type AccountOverview = {
  account_id: string; income_total: number; expense_total: number;
  transfer_in: number; transfer_out: number; card_paid: number; estimated_balance: number;
};
export type CardOverview = {
  card_id: string; purchases_total: number; payments_total: number; unpaid_total: number;
};
export type RecurringPost = { rule_id: string; transaction_id: string; month_start: string };
export type PlannerTransaction = {
  id: string; user_id: string; tipo: MoneyType; valor: number;
  descricao: string; categoria: string; data: string;
  account_id: string | null; card_id: string | null;
};
export type PlannerData = {
  accounts: FinanceAccount[]; cards: FinanceCard[]; goals: FinanceGoal[];
  contributions: GoalContribution[]; budgets: FinanceBudget[];
  rules: RecurringRule[]; transactions: PlannerTransaction[];
  accountOverview: AccountOverview[]; cardOverview: CardOverview[]; posts: RecurringPost[];
};

const check = (error: { message?: string } | null) => {
  if (error) throw new Error(error.message || 'Não foi possível concluir a operação.');
};
async function userId() {
  const { data, error } = await supabaseAuth.auth.getUser();
  check(error);
  if (!data.user?.id) throw new Error('Sessão expirada. Entre novamente.');
  return data.user.id;
}
export function monthIso(month: number, year: number) {
  return year + '-' + String(month).padStart(2, '0') + '-01';
}
export function lastDay(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}
export function recurringDate(month: number, year: number, day: number) {
  return year + '-' + String(month).padStart(2, '0') + '-' +
    String(Math.min(day, lastDay(month, year))).padStart(2, '0');
}
export const validMoney = (v: number) => Number.isFinite(v) && v > 0 && v <= 1e12;
export async function loadPlanner(month: number, year: number): Promise<PlannerData> {
  const uid = await userId();
  const start = monthIso(month, year);
  const end = monthIso(month === 12 ? 1 : month + 1, month === 12 ? year + 1 : year);
  // RLS applies to each request; explicit user_id filters also reduce bandwidth.
  const [a, c, g, gc, b, rr, t, ao, co, posts] = await Promise.all([
    supabaseAuth.from('finance_accounts').select('*').eq('user_id', uid).order('name'),
    supabaseAuth.from('finance_cards').select('*').eq('user_id', uid).order('name'),
    supabaseAuth.from('finance_goals').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    supabaseAuth.from('finance_goal_contributions').select('*').eq('user_id', uid).order('recorded_at', { ascending: false }),
    supabaseAuth.from('finance_budgets').select('*').eq('user_id', uid).eq('year', year).eq('month', month),
    supabaseAuth.from('finance_recurring_rules').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    supabaseAuth.from('lancamentos').select('id,user_id,tipo,valor,descricao,categoria,data,account_id,card_id')
      .eq('user_id', uid).gte('data', start).lt('data', end).order('data', { ascending: false }).limit(1500),
    supabaseAuth.rpc('finance_account_overview'),
    supabaseAuth.rpc('finance_card_overview'),
    supabaseAuth.from('finance_recurring_posts').select('rule_id,transaction_id,month_start')
      .eq('user_id', uid).eq('month_start',start),
  ]);
  for (const result of [a, c, g, gc, b, rr, t, ao, co, posts]) check(result.error);
  return {
    accounts: (a.data || []) as FinanceAccount[],
    cards: (c.data || []) as FinanceCard[],
    goals: (g.data || []) as FinanceGoal[],
    contributions: (gc.data || []) as GoalContribution[],
    budgets: (b.data || []) as FinanceBudget[],
    rules: (rr.data || []) as RecurringRule[],
    transactions: (t.data || []) as PlannerTransaction[],
    accountOverview: (ao.data || []) as AccountOverview[],
    cardOverview: (co.data || []) as CardOverview[],
    posts: (posts.data || []) as RecurringPost[],
  };
}
async function insertRecord(table: string, record: Record<string, unknown>) {
  const uid = await userId();
  const { error } = await supabaseAuth.from(table).insert({ ...record, user_id: uid });
  check(error);
}
async function patchRecord(table: string, id: string, patch: Record<string, unknown>) {
  const uid = await userId();
  const { error } = await supabaseAuth.from(table).update(patch).eq('id', id).eq('user_id', uid);
  check(error);
}
export async function addAccount(name: string, kind: FinanceAccount['kind'], opening_balance = 0) {
  await insertRecord('finance_accounts', { name: name.trim(), kind, opening_balance });
}
export async function addCard(name: string, credit_limit: number, closing_day: number, due_day: number) {
  await insertRecord('finance_cards', { name: name.trim(), credit_limit, closing_day, due_day });
}
export async function addGoal(name: string, target_amount: number, target_date: string | null, saved_initial = 0) {
  await insertRecord('finance_goals', { name: name.trim(), target_amount, target_date, saved_initial });
}
export async function contributeToGoal(goal_id: string, amount: number) {
  await insertRecord('finance_goal_contributions', { goal_id, amount });
}
export async function removeContribution(id: string) {
  const uid = await userId();
  const { error } = await supabaseAuth.from('finance_goal_contributions')
    .delete().eq('user_id', uid).eq('id', id);
  check(error);
}
export async function setBudget(year: number, month: number, category: string, amount: number) {
  const uid = await userId();
  const { error } = await supabaseAuth.from('finance_budgets').upsert(
    { user_id: uid, year, month, category, amount },
    { onConflict: 'user_id,year,month,category' }
  );
  check(error);
}
export async function addRecurringRule(fields: {
  description: string; category: string; kind: MoneyType;
  amount: number; day_of_month: number; start_month: string;
  account_id?: string | null; card_id?: string | null;
}) {
  await insertRecord('finance_recurring_rules', { ...fields, description: fields.description.trim() });
}
export async function setPlannerActive(
  table: 'finance_accounts' | 'finance_cards' | 'finance_goals' | 'finance_recurring_rules',
  id: string, active: boolean
) {
  await patchRecord(table, id, { active });
}
export async function linkTransaction(
  id: string, account_id: string | null, card_id: string | null
) {
  await patchRecord('lancamentos', id, { account_id, card_id });
}
/** Runs only in the currently authenticated user's context. Never performs a bank charge. */
export async function applyMonthlyRecurring(month: number, year: number): Promise<number> {
  const now = new Date();
  if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1))
    throw new Error('Não é possível gerar lançamentos futuros.');
  await userId();
  const { data, error } = await supabaseAuth.rpc('finance_apply_recurring', { p_month: monthIso(month, year) });
  check(error);
  return Number(data || 0);
}
export function goalProgress(goal: FinanceGoal, contributions: GoalContribution[]) {
  const saved = Number(goal.saved_initial) + contributions
    .filter(c => c.goal_id === goal.id).reduce((sum, c) => sum + Number(c.amount), 0);
  const target = Number(goal.target_amount);
  return { saved, target, remaining: Math.max(0, target - saved), percent: Math.min(100, target ? saved / target * 100 : 0) };
}
export type Insight = { id: string; heading: string; text: string; tone: 'neutral' | 'warning' | 'positive' };
export function buildInsights(data: PlannerData): Insight[] {
  const result: Insight[] = [];
  const expenses = data.transactions.filter(x => x.tipo === 'despesa');
  const totalExpense = expenses.reduce((v, t) => v + Number(t.valor), 0);
  const totalIncome = data.transactions.filter(x => x.tipo === 'receita').reduce((v, t) => v + Number(t.valor), 0);
  if (!data.transactions.length) return [{
    id: 'empty', heading: 'Comece registrando suas movimentações',
    text: 'Com receitas e despesas cadastradas, você verá análises reais do seu dinheiro.', tone: 'neutral'
  }];
  const byCategory: Record<string, number> = {};
  for (const item of expenses) byCategory[item.categoria] = (byCategory[item.categoria] || 0) + Number(item.valor);
  const top = Object.entries(byCategory).sort((a,b) => b[1] - a[1])[0];
  if (top) result.push({
    id: 'top', heading: 'Maior categoria de gastos',
    text: top[0] + ' representa ' + (top[1] / Math.max(totalExpense, 1) * 100).toFixed(0) +
      '% das despesas do período.', tone: 'neutral',
  });
  if (totalIncome < totalExpense) result.push({
    id: 'deficit', heading: 'Despesas acima das receitas',
    text: 'Neste mês, os gastos cadastrados ultrapassaram as entradas. Confira seus lançamentos.',
    tone: 'warning',
  });
  else if (totalIncome > 0) result.push({
    id: 'surplus', heading: 'Resultado positivo neste mês',
    text: 'Suas entradas registradas superam os gastos registrados no período.',
    tone: 'positive',
  });
  for (const budget of data.budgets) {
    const spent = Number(byCategory[budget.category] || 0), cap = Number(budget.amount);
    if (spent >= cap * .8) result.push({
      id: 'budget-' + budget.id, heading: spent > cap ? 'Orçamento ultrapassado' : 'Orçamento perto do limite',
      text: budget.category + ': ' + (cap ? Math.round(spent / cap * 100) : 0) +
        '% do valor planejado já foi gasto.', tone: spent > cap ? 'warning' : 'neutral'
    });
  }
  for (const goal of data.goals.filter(g => g.active)) {
    const progress = goalProgress(goal, data.contributions);
    if (progress.percent >= 100) result.push({
      id: 'goal-' + goal.id, heading: 'Meta alcançada',
      text: goal.name + ' atingiu o valor planejado.', tone: 'positive'
    });
  }
  return result.slice(0, 8);
}

/** Bookkeeping transfers. No external banking operation occurs. */
export async function recordAccountTransfer(from: string, to: string, amount: number) {
  await userId();
  const { error } = await supabaseAuth.rpc('finance_record_transfer', {
    p_from: from, p_to: to, p_amount: amount,
  });
  check(error);
}
/** Settles recorded card purchases from an internal account, without double-counting an expense. */
export async function recordCardPayment(card: string, account: string, amount: number) {
  await userId();
  const { error } = await supabaseAuth.rpc('finance_record_card_payment', {
    p_card: card, p_account: account, p_amount: amount,
  });
  check(error);
}
export async function confirmRecurring(ruleId: string, month: number, year: number): Promise<boolean> {
  await userId();
  const { data, error } = await supabaseAuth.rpc('finance_confirm_recurring', {
    p_rule: ruleId, p_month: monthIso(month, year),
  });
  check(error);
  return Boolean(data);
}
