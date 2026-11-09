import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import {
  addAccount, addCard, linkTransaction, setPlannerActive,
  type FinanceAccount, type FinanceCard, type PlannerData,
} from '../../services/finance-planner';
import { moeda } from './FinanceVisuals';

type Props = { data: PlannerData; refresh: () => Promise<void> };
const decimal = (s: string) => Number(s.replace(',', '.'));
function Field({ label, value, change, hint }: {
  label: string; value: string; change: (s: string) => void; hint?: string
}) {
  const styles = useAccessibleStyles(base);
  const { isDark } = useAccessibility();
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} accessibilityLabel={label} value={value}
      onChangeText={change} placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
    {hint ? <Text style={styles.muted}>{hint}</Text> : null}
  </View>;
}
function Chip({ label, selected, onPress }: {
  label: string; selected?: boolean; onPress: () => void
}) {
  const s = useAccessibleStyles(base);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[s.chip, selected && s.chipOn]}>
    <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
  </Pressable>;
}

export function PlannerAccounts({ data, refresh }: Props) {
  const s = useAccessibleStyles(base);
  const [type, setType] = useState<'accounts'|'cards'>('accounts');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<FinanceAccount['kind']>('bank');
  const [balance, setBalance] = useState('0');
  const [limit, setLimit] = useState('0');
  const [closeDay, setCloseDay] = useState('1');
  const [dueDay, setDueDay] = useState('10');
  const [linkTx, setLinkTx] = useState<string | null>(null);
  const [selection, setSelection] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const activeAccounts = data.accounts.filter(x => x.active);
  const activeCards = data.cards.filter(x => x.active);

  async function run(action: () => Promise<void>, done: string) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); await refresh(); setMessage(done); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (name.trim().length < 2 || name.trim().length > 70) {
      setError('Informe um nome de 2 a 70 caracteres.'); return;
    }
    if (type === 'accounts') {
      const amount = decimal(balance);
      if (!Number.isFinite(amount) || Math.abs(amount) > 1e12) {
        setError('Informe um saldo inicial válido.'); return;
      }
      await run(() => addAccount(name, kind, amount), 'Conta cadastrada.');
    } else {
      const cap = decimal(limit), close = Number(closeDay), due = Number(dueDay);
      if (!Number.isFinite(cap) || cap < 0 || cap > 1e12 ||
          !Number.isInteger(close) || close < 1 || close > 28 ||
          !Number.isInteger(due) || due < 1 || due > 28) {
        setError('Confira limite, dia de fechamento e vencimento (entre 1 e 28).'); return;
      }
      await run(() => addCard(name, cap, close, due), 'Cartão cadastrado.');
    }
    setName('');
  }
  async function toggle(table: 'finance_accounts'|'finance_cards', id: string, active: boolean) {
    await run(() => setPlannerActive(table, id, !active),
      active ? 'Item arquivado. Os lançamentos permanecem preservados.' : 'Item reativado.');
  }
  async function saveLink() {
    if (!linkTx) return;
    let accountId: string | null = null, cardId: string | null = null;
    if (selection.startsWith('account:')) accountId = selection.slice(8);
    if (selection.startsWith('card:')) cardId = selection.slice(5);
    await run(() => linkTransaction(linkTx, accountId, cardId), 'Movimentação vinculada.');
    setLinkTx(null); setSelection('');
  }
  return <View style={s.section}>
    <Text style={s.heading}>Contas e cartões</Text>
    <Text style={s.muted}>Organize onde seu dinheiro está e identifique compras feitas no cartão. Nenhuma operação movimenta dinheiro de verdade.</Text>
    <View style={s.card}>
      <Text style={s.title}>Adicionar {type === 'accounts' ? 'conta' : 'cartão'}</Text>
      <View style={s.row}>
        <Chip label="Conta ou carteira" selected={type === 'accounts'} onPress={() => setType('accounts')} />
        <Chip label="Cartão de crédito" selected={type === 'cards'} onPress={() => setType('cards')} />
      </View>
      <Field label={type === 'accounts' ? 'Nome da conta' : 'Nome do cartão'} value={name} change={setName}
        hint={type === 'accounts' ? 'Ex.: Carteira, Conta principal' : 'Ex.: Cartão pessoal'} />
      {type === 'accounts' ? <>
        <Text style={s.label}>Tipo de conta</Text>
        <View style={s.row}>
          <Chip label="Banco" selected={kind === 'bank'} onPress={() => setKind('bank')}/>
          <Chip label="Dinheiro" selected={kind === 'cash'} onPress={() => setKind('cash')}/>
          <Chip label="Investimento" selected={kind === 'investment'} onPress={() => setKind('investment')}/>
        </View>
        <Field label="Saldo inicial de referência (R$)" value={balance} change={setBalance}
          hint="Informe o saldo que já existia. Não é adicionado às receitas do mês." />
      </> : <View style={s.row}>
        <View style={s.fieldWrap}><Field label="Limite do cartão (R$)" value={limit} change={setLimit}/></View>
        <View style={s.fieldWrap}><Field label="Dia do fechamento" value={closeDay} change={setCloseDay}/></View>
        <View style={s.fieldWrap}><Field label="Dia do vencimento" value={dueDay} change={setDueDay}/></View>
      </View>}
      <Pressable style={s.primary} accessibilityRole="button" disabled={busy} onPress={() => void save()}>
        <Text style={s.primaryText}>{busy ? 'Salvando...' : 'Cadastrar'}</Text>
      </Pressable>
      {!!error && <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text>}
      {!!message && <Text style={s.positive} accessibilityLiveRegion="polite">{message}</Text>}
    </View>
    <View style={s.row}>
      <View style={s.listCard}>
        <Text style={s.title}>Suas contas ({activeAccounts.length})</Text>
        {!data.accounts.length && <Text style={s.muted}>Nenhuma conta cadastrada.</Text>}
        {data.accounts.map(item => {
          const value = data.transactions.filter(tx => tx.account_id === item.id)
            .reduce((v, tx) => v + (tx.tipo === 'receita' ? 1 : -1) * Number(tx.valor), 0);
          return <View key={item.id} style={s.entry}>
            <View style={s.entryText}><Text style={s.entryTitle}>{item.name}{!item.active ? ' (arquivada)' : ''}</Text>
              <Text style={s.muted}>Saldo inicial: {moeda(Number(item.opening_balance))}</Text>
              <Text style={s.muted}>Movimento vinculado neste mês: {moeda(value)}</Text></View>
            <Chip label={item.active ? 'Arquivar' : 'Reativar'} onPress={() => void toggle('finance_accounts', item.id, item.active)} />
          </View>;
        })}
      </View>
      <View style={s.listCard}>
        <Text style={s.title}>Seus cartões ({activeCards.length})</Text>
        {!data.cards.length && <Text style={s.muted}>Nenhum cartão cadastrado.</Text>}
        {data.cards.map((item: FinanceCard) => {
          const spent = data.transactions.filter(tx => tx.card_id === item.id && tx.tipo === 'despesa')
            .reduce((v, tx) => v + Number(tx.valor), 0);
          return <View key={item.id} style={s.entry}>
            <View style={s.entryText}>
              <Text style={s.entryTitle}>{item.name}{!item.active ? ' (arquivado)' : ''}</Text>
              <Text style={s.muted}>Limite informado: {moeda(Number(item.credit_limit))}</Text>
              <Text style={s.muted}>Compras vinculadas ao período: {moeda(spent)}</Text>
              <Text style={s.muted}>Fecha dia {item.closing_day} · vence dia {item.due_day}</Text>
            </View>
            <Chip label={item.active ? 'Arquivar' : 'Reativar'} onPress={() => void toggle('finance_cards', item.id, item.active)} />
          </View>;
        })}
      </View>
    </View>
    <View style={s.card}>
      <Text style={s.title}>Vincular lançamentos existentes</Text>
      <Text style={s.muted}>Escolha uma movimentação deste mês e indique sua conta ou cartão. Isso não duplica nem altera o valor do lançamento.</Text>
      {!data.transactions.length && <Text style={s.muted}>Cadastre um lançamento para vinculá-lo.</Text>}
      {data.transactions.slice(0, 50).map(tx => (
        <View key={tx.id} style={s.entry}>
          <View style={s.entryText}>
            <Text style={s.entryTitle}>{tx.descricao} · {moeda(Number(tx.valor))}</Text>
            <Text style={s.muted}>{tx.data} · {data.accounts.find(a => a.id === tx.account_id)?.name ||
              data.cards.find(a => a.id === tx.card_id)?.name || 'Sem vínculo'}</Text>
          </View>
          <Chip label={linkTx === tx.id ? 'Cancelar' : 'Vincular'} onPress={() => {
            setLinkTx(linkTx === tx.id ? null : tx.id); setSelection(tx.account_id ? 'account:' + tx.account_id :
              tx.card_id ? 'card:' + tx.card_id : '');
          }} />
          {linkTx === tx.id && <View style={s.full}>
            <View style={s.row}>
              <Chip label="Sem vínculo" selected={!selection} onPress={() => setSelection('')} />
              {activeAccounts.map(a => <Chip key={a.id} label={a.name} selected={selection === 'account:' + a.id} onPress={() => setSelection('account:' + a.id)} />)}
              {activeCards.map(a => <Chip key={a.id} label={a.name} selected={selection === 'card:' + a.id} onPress={() => setSelection('card:' + a.id)} />)}
            </View>
            <Pressable style={s.primary} accessibilityRole="button" onPress={() => void saveLink()} disabled={busy}>
              <Text style={s.primaryText}>Salvar vínculo</Text>
            </Pressable>
          </View>}
        </View>
      ))}
      {data.transactions.length > 50 && <Text style={s.muted}>Exibindo os 50 lançamentos mais recentes do período.</Text>}
    </View>
  </View>;
}

const base = StyleSheet.create({
  section: { gap: 15 }, heading: { fontSize: 24, fontWeight: '900', color: '#111827' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#ECE8F1', gap: 12 },
  listCard: { flexGrow: 1, flexBasis: 270, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#ECE8F1', gap: 12 },
  title: { fontSize: 18, color: '#111827', fontWeight: '800' },
  muted: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fieldWrap: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
  field: { gap: 6 }, label: { fontSize: 13, fontWeight: '700', color: '#374151' },
  input: { minHeight: 46, backgroundColor: '#FCFBFD', borderWidth: 1, borderColor: '#DDD6E6', color: '#111827', borderRadius: 12, paddingHorizontal: 13, fontSize: 15 },
  primary: { backgroundColor: '#7C3AED', borderRadius: 12, paddingHorizontal: 17, minHeight: 45, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  chip: { minHeight: 42, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderColor: '#DDD6E6', borderRadius: 11, justifyContent: 'center' },
  chipOn: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  chipText: { color: '#374151', fontWeight: '700', fontSize: 12 },
  chipTextOn: { color: '#5B21B6' },
  entry: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#ECE8F1', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  entryTitle: { color: '#111827', fontSize: 14, fontWeight: '800' },
  entryText: { flex: 1, minWidth: 130, gap: 5 },
  full: { width: '100%', gap: 10 },
  error: { color: '#B91C1C', fontSize: 13 }, positive: { color: '#15803D', fontSize: 13 },
});
