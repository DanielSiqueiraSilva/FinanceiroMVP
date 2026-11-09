/**
 * UI-only validations for financial bookkeeping. The database RPCs remain
 * authoritative (including outstanding card limits and authenticated ownership).
 * These selectors never create transactions or access external accounts.
 */
export type AccountOption = { id: string; active: boolean };
export type CardOption = { id: string; active: boolean };
export type CardOutstanding = { card_id: string; unpaid_total: number };

export const MAX_FINANCE_AMOUNT = 999999999999;

export function parseBRLInput(input: string): number | null {
  const raw = input.trim().replace(/\s/g, '').replace(/^R\$/i, '');
  const brazilian = /^-?(?:(?:\d{1,3}(?:\.\d{3})+)|\d+)(?:,\d{1,2})?$/;
  const plainDot = /^-?\d+\.\d{1,2}$/;
  if (!brazilian.test(raw) && !plainDot.test(raw)) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') :
    /^-?\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw;
  const value = Number(normalized);
  if (!Number.isFinite(value) || Math.abs(value) > MAX_FINANCE_AMOUNT) return null;
  return value;
}

export function positiveAmount(input: string): number | null {
  const amount = parseBRLInput(input);
  return amount !== null && amount > 0 ? amount : null;
}

export function validateTransfer(
  fromId: string, toId: string, amount: number | null, accounts: readonly AccountOption[],
): string | null {
  if (!fromId || !toId || fromId === toId) return 'Escolha duas contas diferentes.';
  if (!accounts.some(x => x.id === fromId && x.active) ||
      !accounts.some(x => x.id === toId && x.active))
    return 'Selecione apenas contas ativas.';
  if (amount === null || amount <= 0 || amount > MAX_FINANCE_AMOUNT)
    return 'Informe um valor válido maior que zero.';
  return null;
}

export function validateCardPayment(
  cardId: string, accountId: string, amount: number | null,
  accounts: readonly AccountOption[], cards: readonly CardOption[],
  overview: readonly CardOutstanding[],
): string | null {
  if (!cards.some(x => x.id === cardId && x.active))
    return 'Escolha um cartão ativo.';
  if (!accounts.some(x => x.id === accountId && x.active))
    return 'Escolha uma conta ativa para registrar o pagamento.';
  if (amount === null || amount <= 0 || amount > MAX_FINANCE_AMOUNT)
    return 'Informe um valor válido maior que zero.';
  const pending = overview.find(x => x.card_id === cardId);
  if (!pending || !Number.isFinite(Number(pending.unpaid_total)))
    return 'O valor pendente do cartão está indisponível. Atualize os dados.';
  if (Math.round(amount * 100) > Math.round(Math.max(0, Number(pending.unpaid_total)) * 100))
    return 'O pagamento é maior que as compras pendentes registradas neste cartão.';
  return null;
}

export function validateLinkChoice(
  type: 'receita' | 'despesa', source: string,
  accounts: readonly AccountOption[], cards: readonly CardOption[],
): string | null {
  if (source === '') return null;
  if (source.startsWith('account:')) {
    const id = source.slice('account:'.length);
    return accounts.some(x => x.id === id && x.active)
      ? null : 'Selecione uma conta ativa.';
  }
  if (source.startsWith('card:')) {
    if (type !== 'despesa')
      return 'Receitas não podem ser vinculadas a cartões de crédito.';
    const id = source.slice('card:'.length);
    return cards.some(x => x.id === id && x.active)
      ? null : 'Selecione um cartão ativo.';
  }
  return 'Escolha uma conta, cartão ou a opção sem vínculo.';
}
