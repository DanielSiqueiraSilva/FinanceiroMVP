import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import {
  addAccount, addCard, linkTransaction, setPlannerActive, recordAccountTransfer, recordCardPayment,
  type FinanceAccount, type FinanceCard, type PlannerData,
} from '../../services/finance-planner';
import { moeda } from './FinanceVisuals';
import { plannerBalances } from '../dashboard/dashboard-data';
import { OceanButton, OceanSegmentedControl } from '../../design/OceanControls';
import {
  parseBRLInput, positiveAmount, validateCardPayment, validateLinkChoice,
  validateTransfer,
} from './finance-flow-validation';

const ACCOUNT_TABS = [
  { value: 'accounts', label: 'Conta ou carteira' },
  { value: 'cards', label: 'Cartão de crédito' },
] as const;

type Props = { data: PlannerData; refresh: () => Promise<void>;
  initialOperation?: 'transfer' | 'payment' | 'link' | null; };
function Field({ label, value, change, hint, numeric = false }: {
  label: string; value: string; change: (s: string) => void; hint?: string; numeric?: boolean;
}) {
  const styles = useAccessibleStyles(base);
  const { isDark } = useAccessibility();
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} accessibilityLabel={label} value={value}
      onChangeText={change} keyboardType={numeric ? 'decimal-pad' : 'default'}
      placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
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

export function PlannerAccounts({ data, refresh, initialOperation = null }: Props) {
  const s = useAccessibleStyles(base);
  const [type, setType] = useState<'accounts'|'cards'>('accounts');
  const [operation, setOperation] = useState<'transfer' | 'payment' | 'link' | null>(initialOperation);
  useEffect(() => {
    if (initialOperation) setOperation(initialOperation);
  }, [initialOperation]);
  const busyRef = useRef(false);
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
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payCard, setPayCard] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const activeAccounts = data.accounts.filter(x => x.active);
  const activeCards = data.cards.filter(x => x.active);
  const balances = plannerBalances(data);

  async function run(action: () => Promise<void>, done: string): Promise<boolean> {
    // A ref prevents rapid double taps before React commits the disabled state.
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true); setError(''); setMessage('');
    try {
      await action();
      try { await refresh(); }
      catch { setMessage(done + ' Atualize os dados para visualizar os novos totais.'); return true; }
      setMessage(done);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function confirmRecord(title: string, description: string, action: () => void) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(title + '\\n\\n' + description)) action();
      return;
    }
    Alert.alert(title, description, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar registro', onPress: action },
    ]);
  }
  async function save() {
    if (name.trim().length < 2 || name.trim().length > 70) {
      setError('Informe um nome de 2 a 70 caracteres.'); return;
    }
    if (type === 'accounts') {
      const amount = parseBRLInput(balance);
      if (amount === null) {
        setError('Informe um saldo inicial válido.'); return;
      }
      const saved = await run(() => addAccount(name, kind, amount), 'Conta cadastrada.');
      if (saved) setName('');
    } else {
      const cap = parseBRLInput(limit), close = Number(closeDay), due = Number(dueDay);
      if (cap === null || cap < 0 ||
          !Number.isInteger(close) || close < 1 || close > 28 ||
          !Number.isInteger(due) || due < 1 || due > 28) {
        setError('Confira limite, dia de fechamento e vencimento (entre 1 e 28).'); return;
      }
      const saved = await run(() => addCard(name, cap, close, due), 'Cartão cadastrado.');
      if (saved) setName('');
    }
  }
  async function toggle(table: 'finance_accounts'|'finance_cards', id: string, active: boolean) {
    await run(() => setPlannerActive(table, id, !active),
      active ? 'Item arquivado. Os lançamentos permanecem preservados.' : 'Item reativado.');
  }
  async function saveTransfer() {
    const n = positiveAmount(transferAmount);
    const issue = validateTransfer(fromAccount, toAccount, n, data.accounts);
    if (issue || n === null) { setError(issue || 'Valor inválido.'); return; }
    confirmRecord('Registrar transferência',
      'Essa operação somente ajusta os saldos estimados das contas no aplicativo. Não cria receita ou despesa nem movimenta dinheiro no banco.',
      () => { void run(
        () => recordAccountTransfer(fromAccount, toAccount, n),
        'Transferência registrada entre contas, sem criar receita ou despesa.',
      ).then(ok => { if (ok) setTransferAmount(''); }); });
  }
  async function savePayment() {
    const n = positiveAmount(payAmount);
    const issue = validateCardPayment(
      payCard, payAccount, n, data.accounts, data.cards, data.cardOverview,
    );
    if (issue || n === null) { setError(issue || 'Valor inválido.'); return; }
    confirmRecord('Registrar pagamento de cartão',
      'Confirme somente se você já pagou o cartão. O registro diminui o saldo estimado da conta e o pendente do cartão, sem lançar uma nova despesa.',
      () => { void run(
        () => recordCardPayment(payCard, payAccount, n),
        'Pagamento registrado. Não foi lançada uma segunda despesa.',
      ).then(ok => { if (ok) setPayAmount(''); }); });
  }
  async function saveLink() {
    if (!linkTx) return;
    const tx = data.transactions.find(x => x.id === linkTx);
    if (!tx) { setError('Lançamento não encontrado. Atualize o período.'); return; }
    const issue = validateLinkChoice(tx.tipo, selection, data.accounts, data.cards);
    if (issue) { setError(issue); return; }
    const accountId = selection.startsWith('account:') ? selection.slice(8) : null;
    const cardId = selection.startsWith('card:') ? selection.slice(5) : null;
    const saved = await run(
      () => linkTransaction(linkTx, accountId, cardId),
      'Vínculo atualizado no lançamento existente; nenhum valor foi duplicado.',
    );
    if (saved) { setLinkTx(null); setSelection(''); }
  }
  return <View style={s.section}>
    <Text style={s.heading}>Contas e cartões</Text>
    <Text style={s.muted}>Conecte seus lançamentos às contas e cartões e acompanhe valores estimados, sem acesso automático ao banco.</Text>
    <View style={s.guideCard}>
      <Text style={s.guideTitle}>Como suas finanças se conectam</Text>
      <Text style={s.guideText}>1. Contas guardam o saldo inicial e acompanham entradas, saídas e transferências registradas.</Text>
      <Text style={s.guideText}>2. Cartões agrupam compras lançadas; pagar o cartão reduz o valor pendente sem criar uma despesa nova.</Text>
      <Text style={s.guideText}>3. Lançamentos e recorrências podem ser vinculados a uma conta ou cartão, sem duplicação.</Text>
    </View>
    <View style={s.summaryRow}>
      <View style={s.summaryCard}>
        <Text style={s.summaryLabel}>Nas contas · estimativa</Text>
        <Text style={s.summaryAmount}>{balances.accountTotal === null ? 'Indisponível' : moeda(balances.accountTotal)}</Text>
        <Text style={s.muted}>Não representa consulta ao banco.</Text>
      </View>
      <View style={s.summaryCard}>
        <Text style={s.summaryLabel}>Cartões · compras pendentes</Text>
        <Text style={s.summaryAmount}>{balances.cardPending === null ? 'Indisponível' : moeda(balances.cardPending)}</Text>
        <Text style={s.muted}>Compras registradas menos pagamentos informados.</Text>
      </View>
    </View>
    {!!error && <Text style={s.error} accessibilityLiveRegion="assertive">{error}</Text>}
    {!!message && <Text style={s.positive} accessibilityLiveRegion="polite">{message}</Text>}
    <View style={s.card}>
      <Text style={s.title}>Adicionar {type === 'accounts' ? 'conta' : 'cartão'}</Text>
      <OceanSegmentedControl value={type} options={ACCOUNT_TABS}
        onChange={setType} disabled={busy} />
      <Field label={type === 'accounts' ? 'Nome da conta' : 'Nome do cartão'} value={name} change={setName}
        hint={type === 'accounts' ? 'Ex.: Carteira, Conta principal' : 'Ex.: Cartão pessoal'} />
      {type === 'accounts' ? <>
        <Text style={s.label}>Tipo de conta</Text>
        <View style={s.row}>
          <Chip label="Banco" selected={kind === 'bank'} onPress={() => setKind('bank')}/>
          <Chip label="Dinheiro" selected={kind === 'cash'} onPress={() => setKind('cash')}/>
          <Chip label="Investimento" selected={kind === 'investment'} onPress={() => setKind('investment')}/>
        </View>
        <Field label="Saldo inicial de referência (R$)" value={balance} change={setBalance} numeric
          hint="Informe o saldo que já existia. Não é adicionado às receitas do mês." />
      </> : <View style={s.row}>
        <View style={s.fieldWrap}><Field label="Limite do cartão (R$)" value={limit} change={setLimit} numeric/></View>
        <View style={s.fieldWrap}><Field label="Dia do fechamento" value={closeDay} change={setCloseDay} numeric/></View>
        <View style={s.fieldWrap}><Field label="Dia do vencimento" value={dueDay} change={setDueDay} numeric/></View>
      </View>}
      <OceanButton variant="primary" label="Cadastrar" loading={busy}
        onPress={() => void save()} />
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
              <Text style={s.muted}>Movimentações vinculadas neste mês: {moeda(value)}</Text>
              <Text style={s.entryTitle}>Saldo estimado: {moeda(Number(data.accountOverview.find(o => o.account_id === item.id)?.estimated_balance ?? item.opening_balance))}</Text></View>
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
              <Text style={s.muted}>Compras vinculadas neste mês: {moeda(spent)}</Text>
              <Text style={s.entryTitle}>Compras ainda não marcadas como pagas: {moeda(Number(data.cardOverview.find(o => o.card_id === item.id)?.unpaid_total ?? 0))}</Text>
              <Text style={s.muted}>Fecha dia {item.closing_day} · vence dia {item.due_day}</Text>
            </View>
            <Chip label={item.active ? 'Arquivar' : 'Reativar'} onPress={() => void toggle('finance_cards', item.id, item.active)} />
          </View>;
        })}
      </View>
    </View>
    <View style={s.card}>
      <Text style={s.title}>O que você deseja fazer?</Text>
      <Text style={s.muted}>Escolha uma operação para ver somente os campos necessários.</Text>
      <View style={s.row}>
        <Chip label="Transferir entre contas" selected={operation === 'transfer'}
          onPress={() => setOperation(operation === 'transfer' ? null : 'transfer')} />
        <Chip label="Registrar pagamento" selected={operation === 'payment'}
          onPress={() => setOperation(operation === 'payment' ? null : 'payment')} />
        <Chip label="Vincular lançamento" selected={operation === 'link'}
          onPress={() => setOperation(operation === 'link' ? null : 'link')} />
      </View>
    </View>
    {operation === 'transfer' && <View style={s.card}>
      <Text style={s.title}>Transferência entre contas</Text>
      <Text style={s.muted}>Registre dinheiro movido de uma conta para outra. Não afeta receitas ou despesas.</Text>
      {activeAccounts.length < 2 && <Text style={s.muted}>Cadastre pelo menos duas contas ativas para registrar uma transferência.</Text>}
      <Text style={s.label}>Conta de origem</Text>
      <View style={s.row}>{activeAccounts.map(a=><Chip key={a.id} label={a.name} selected={fromAccount===a.id} onPress={()=>setFromAccount(a.id)}/>)}</View>
      <Text style={s.label}>Conta de destino</Text>
      <View style={s.row}>{activeAccounts.map(a=><Chip key={a.id} label={a.name} selected={toAccount===a.id} onPress={()=>setToAccount(a.id)}/>)}</View>
      <Field label="Valor transferido (R$)" value={transferAmount} change={setTransferAmount} numeric/>
      <Pressable accessibilityRole="button" style={[s.primary,busy && s.disabled]}
        disabled={busy||activeAccounts.length<2} onPress={()=>void saveTransfer()}>
        <Text style={s.primaryText}>Conferir transferência</Text>
      </Pressable>
    </View>}
    {operation === 'payment' && <View style={s.card}>
      <Text style={s.title}>Pagamento de cartão</Text>
      <Text style={s.muted}>Registre somente um pagamento que já aconteceu. O valor diminui as compras pendentes registradas, sem gerar uma segunda despesa.</Text>
      {(!activeAccounts.length || !activeCards.length) && <Text style={s.muted}>É necessário ter uma conta e um cartão ativos.</Text>}
      <Text style={s.label}>Cartão que foi pago</Text>
      <View style={s.row}>{activeCards.map(a=><Chip key={a.id} label={a.name} selected={payCard===a.id} onPress={()=>setPayCard(a.id)}/>)}</View>
      {payCard && <Text style={s.muted}>Pendente registrado: {
        (() => { const item = data.cardOverview.find(x => x.card_id === payCard);
          return item ? moeda(Number(item.unpaid_total)) : 'Indisponível'; })()
      }</Text>}
      <Text style={s.label}>Conta usada no pagamento</Text>
      <View style={s.row}>{activeAccounts.map(a=><Chip key={a.id} label={a.name} selected={payAccount===a.id} onPress={()=>setPayAccount(a.id)}/>)}</View>
      <Field label="Valor já pago (R$)" value={payAmount} change={setPayAmount} numeric/>
      <Pressable accessibilityRole="button" style={[s.primary,busy && s.disabled]}
        disabled={busy||!activeAccounts.length||!activeCards.length} onPress={()=>void savePayment()}>
        <Text style={s.primaryText}>Conferir pagamento</Text>
      </Pressable>
      <Text style={s.muted}>Esta é uma anotação financeira, não um pagamento bancário nem a fatura oficial do cartão.</Text>
    </View>}
    {operation === 'link' && <View style={s.card}>
      <Text style={s.title}>Vincular lançamentos existentes</Text>
      <Text style={s.muted}>Selecione a conta de uma entrada ou saída, ou um cartão para uma despesa. O lançamento original permanece com o mesmo valor.</Text>
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
              {tx.tipo === 'despesa' && activeCards.map(a => <Chip key={a.id} label={a.name} selected={selection === 'card:' + a.id} onPress={() => setSelection('card:' + a.id)} />)}
            </View>
            <Pressable style={s.primary} accessibilityRole="button" onPress={() => void saveLink()} disabled={busy}>
              <Text style={s.primaryText}>Salvar vínculo</Text>
            </Pressable>
          </View>}
        </View>
      ))}
      {data.transactions.length > 50 && <Text style={s.muted}>Exibindo os 50 lançamentos mais recentes do período.</Text>}
    </View>}
  </View>;
}

const base = StyleSheet.create({
  section: { gap: 15 }, heading: { fontSize: 24, fontWeight: '900', color: '#111827' },
  guideCard: { backgroundColor: '#0C293D', borderRadius: 20, padding: 18, gap: 10 },
  guideTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  guideText: { fontSize: 12, lineHeight: 19, color: '#D9EDF3' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryCard: { flexGrow: 1, flexBasis: 255, minWidth: 0, backgroundColor: '#FFFFFF',
    borderColor: '#ECE8F1', borderWidth: 1, borderRadius: 17, padding: 17, gap: 8 },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  summaryAmount: { fontSize: 21, fontWeight: '900', color: '#111827', flexShrink: 1 },
  disabled: { opacity: 0.5 },
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
