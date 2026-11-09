import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import {
  addRecurringRule, applyMonthlyRecurring, recurringDate, lastDay, monthIso, setPlannerActive, confirmRecurring,
  type PlannerData, type MoneyType,
} from '../../services/finance-planner';
import { moeda } from './FinanceVisuals';
import { CATEGORIAS } from '../finance/TransactionForm';

type Props = { data: PlannerData; month: number; year: number; refresh: () => Promise<void> };
type Event = { id: string; day: number; title: string; detail: string; type: 'recurring'|'card'|'transaction' };
function Field({ label, value, change }: { label: string; value: string; change: (s: string) => void }) {
  const s = useAccessibleStyles(styles);
  const { isDark } = useAccessibility();
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput value={value} onChangeText={change} style={s.input} accessibilityLabel={label}
      placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
  </View>;
}
function Chip({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  const s = useAccessibleStyles(styles);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
    style={[s.chip, active && s.chipActive]}>
    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
  </Pressable>;
}
export function PlannerAutomation({ data, month, year, refresh }: Props) {
  const s = useAccessibleStyles(styles);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Contas');
  const [kind, setKind] = useState<MoneyType>('despesa');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('10');
  const [source, setSource] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const monthStart = monthIso(month, year);
  const now = new Date();
  const future = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
  const events = useMemo(() => {
    const list: Event[] = [];
    const last = lastDay(month, year);
    for (const rule of data.rules.filter(r => r.active &&
      r.start_month <= monthStart && (!r.end_month || r.end_month >= monthStart) &&
      !data.posts.some(p => p.rule_id === r.id))) {
      const eventDate = recurringDate(month, year, rule.day_of_month);
      list.push({
        id: 'rec-' + rule.id, day: Number(eventDate.slice(-2)), title: rule.description,
        detail: (rule.kind === 'receita' ? 'Receita prevista' : 'Despesa prevista') + ' · ' + moeda(Number(rule.amount)),
        type: 'recurring',
      });
    }
    for (const card of data.cards.filter(c => c.active)) {
      list.push({
        id: 'card-' + card.id, day: Math.min(card.due_day, last),
        title: 'Vencimento informado · ' + card.name,
        detail: 'Data de referência do cartão; não representa fatura calculada',
        type: 'card'
      });
    }
    for (const tx of data.transactions) {
      list.push({
        id: 'tx-' + tx.id, day: Number(tx.data.slice(-2)), title: tx.descricao,
        detail: (tx.tipo === 'receita' ? 'Receita registrada' : 'Despesa registrada') + ' · ' + moeda(Number(tx.valor)),
        type: 'transaction',
      });
    }
    return list.sort((a,b) => a.day - b.day);
  }, [data.rules, data.cards, data.transactions, data.posts, month, year, monthStart]);
  const maxDay = lastDay(month, year);
  const padding = new Date(year, month - 1, 1).getDay();
  const days = Array.from({ length: Math.ceil((maxDay + padding) / 7) * 7 }, (_, i) => i - padding + 1);
  const dailyEvents = selectedDay == null ? events : events.filter(e => e.day === selectedDay);

  async function run(fn: () => Promise<void>, success: string | (() => string)) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await fn(); await refresh(); setMessage(typeof success === 'function' ? success() : success); }
    catch(e){ setError(e instanceof Error ? e.message : 'Não foi possível concluir a ação.'); }
    finally { setBusy(false); }
  }
  function add() {
    const price = Number(amount.replace(',', '.')), n = Number(day);
    if (description.trim().length < 2 || description.trim().length > 120 ||
      !Number.isFinite(price) || price <= 0 || price > 1e12 ||
      !Number.isInteger(n) || n < 1 || n > 31) {
      setError('Preencha descrição, valor positivo e dia entre 1 e 31.');
      return;
    }
    const account_id = source.startsWith('a:') ? source.slice(2) : null;
    const card_id = source.startsWith('c:') ? source.slice(2) : null;
    void run(() => addRecurringRule({ description, category, kind, amount: price, day_of_month: n,
      start_month: monthStart, account_id, card_id }), 'Recorrência cadastrada. Ela aparece como previsão e será registrada após a data programada.');
    setDescription(''); setAmount('');
  }
  async function generate() {
    if (future) return;
    let count = 0;
    await run(async () => { count = await applyMonthlyRecurring(month, year); },
      () => 'Processamento concluído: ' + count + ' lançamento(s) novo(s). Repetir não cria duplicações.');
  }

  async function registerNow(ruleId: string) {
    let created = false;
    await run(async () => { created = await confirmRecurring(ruleId,month,year); },
      () => created
        ? 'Movimentação registrada uma única vez. Ela aparecerá em Lançamentos, Contas ou Cartões.'
        : 'A movimentação deste mês já foi registrada. Nenhuma duplicação ocorreu.');
  }
  return <View style={s.section}>
    <Text style={s.heading}>Automação e calendário</Text>
    <Text style={s.muted}>Cadastre receitas ou despesas que se repetem todos os meses. Elas viram lançamentos financeiros, sem cobrar dinheiro da sua conta.</Text>
    <View style={s.card}>
      <Text style={s.title}>Novo lançamento recorrente</Text>
      <View style={s.row}>
        <Chip label="Despesa mensal" active={kind === 'despesa'} onPress={() => setKind('despesa')}/>
        <Chip label="Receita mensal" active={kind === 'receita'} onPress={() => setKind('receita')}/>
      </View>
      <View style={s.fields}>
        <View style={s.wide}><Field label="Descrição (ex.: internet)" value={description} change={setDescription}/></View>
        <View style={s.narrow}><Field label="Valor (R$)" value={amount} change={setAmount}/></View>
        <View style={s.narrow}><Field label="Dia do mês (1 a 31)" value={day} change={setDay}/></View>
      </View>
      <Text style={s.label}>Categoria</Text>
      <View style={s.row}>
        {CATEGORIAS.map(c => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)}/>)}
      </View>
      <Text style={s.label}>Conta ou cartão (opcional)</Text>
      <View style={s.row}>
        <Chip label="Nenhum" active={!source} onPress={() => setSource('')}/>
        {data.accounts.filter(a => a.active).map(a => <Chip key={a.id} label={a.name} active={source === 'a:' + a.id} onPress={() => setSource('a:' + a.id)}/>)}
        {data.cards.filter(c => c.active).map(c => <Chip key={c.id} label={c.name} active={source === 'c:' + c.id} onPress={() => setSource('c:' + c.id)}/>)}
      </View>
      <Pressable style={s.primary} accessibilityRole="button" disabled={busy} onPress={add}>
        <Text style={s.primaryText}>Cadastrar recorrência</Text>
      </Pressable>
      <Text style={s.muted}>Início: mês selecionado ({String(month).padStart(2,'0')}/{year}). Para meses com menos dias, o dia 29, 30 ou 31 é ajustado ao último dia do mês.</Text>
    </View>
    <View style={s.card}>
      <Text style={s.title}>Recorrências cadastradas</Text>
      {!data.rules.length && <Text style={s.muted}>Nenhuma recorrência cadastrada.</Text>}
      {data.rules.map(rule => <View key={rule.id} style={s.rule}>
        <View style={s.ruleText}><Text style={s.label}>{rule.description}</Text>
          <Text style={s.muted}>{rule.kind === 'receita' ? 'Receita' : 'Despesa'} · {moeda(Number(rule.amount))} · dia {rule.day_of_month}</Text>
          <Text style={s.muted}>{rule.active ? 'Ativa' : 'Pausada'} · desde {rule.start_month.slice(0,7)}</Text>
          <Text style={s.muted}>{data.posts.some(p => p.rule_id === rule.id)
            ? 'Registrada neste mês'
            : rule.start_month > monthStart ? 'Ainda não começou'
            : 'Prevista: ainda não registrada neste mês'}</Text>
        </View>
        <View style={s.row}>
          {rule.active && rule.start_month <= monthStart && !future &&
            !data.posts.some(p => p.rule_id === rule.id) && <Chip label="Registrar agora" onPress={() => void registerNow(rule.id)}/>}
          <Chip label={rule.active ? 'Pausar' : 'Reativar'} onPress={() => void run(
            () => setPlannerActive('finance_recurring_rules', rule.id, !rule.active),
            rule.active ? 'Recorrência pausada.' : 'Recorrência reativada.'
          )}/>
        </View>
      </View>)}
      <Pressable accessibilityRole="button" disabled={busy || future} style={[s.primary, future && s.disabled]}
        onPress={() => void generate()}>
        <Text style={s.primaryText}>{busy ? 'Processando...' : 'Gerar lançamentos deste mês'}</Text>
      </Pressable>
      <Text style={s.muted}>Previsto = compromisso agendado. Registrado = movimentação contabilizada. O processamento registra apenas regras vencidas; "Registrar agora" permite contabilizar antecipadamente somente quando a movimentação realmente aconteceu. Não é um pagamento automático, e nenhum valor é debitado de bancos. A atualização não duplica registros.</Text>
      {!!message && <Text style={s.positive} accessibilityLiveRegion="polite">{message}</Text>}
      {!!error && <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text>}
    </View>
    <View style={s.card}>
      <Text style={s.title}>Calendário financeiro · {String(month).padStart(2,'0')}/{year}</Text>
      <Text style={s.muted}>Selecione um dia para consultar receitas, despesas, recorrências e datas informativas dos cartões.</Text>
      <View style={s.calendar}>
        {['D','S','T','Q','Q','S','S'].map((label,i)=><View key={i} style={s.dayCell}><Text style={s.dayHeader}>{label}</Text></View>)}
        {days.map((d,i) => {
          const valid = d >= 1 && d <= maxDay;
          const hasEvents = valid && events.some(e => e.day === d);
          return <View key={i} style={s.dayCell}>
            {valid && <Pressable accessibilityRole="button" onPress={() => setSelectedDay(selectedDay === d ? null : d)}
              accessibilityState={{ selected: d === selectedDay }}
              accessibilityLabel={'Dia ' + d + ', ' + events.filter(e=>e.day===d).length + ' eventos'}
              style={[s.dayButton, d===selectedDay && s.daySelected]}>
              <Text style={[s.dayText, d===selectedDay && s.daySelectedText]}>{d}</Text>
              {hasEvents && <View style={[s.dot, d===selectedDay && s.dotSelected]}/>}
            </Pressable>}
          </View>;
        })}
      </View>
      <View style={s.row}>
        <Chip label="Ver mês inteiro" active={selectedDay === null} onPress={() => setSelectedDay(null)}/>
        {selectedDay && <Text style={s.muted}>Dia selecionado: {selectedDay}</Text>}
      </View>
      {!dailyEvents.length && <Text style={s.muted}>Nenhum evento para este período.</Text>}
      {dailyEvents.slice(0,70).map(event => <View key={event.id} style={s.event}>
        <Text style={s.dayBadge}>{String(event.day).padStart(2, '0')}</Text>
        <View style={s.ruleText}>
          <Text style={s.label}>{event.title}</Text>
          <Text style={s.muted}>{event.detail}</Text>
          {event.type === 'recurring' && <Text style={s.muted}>Previsão recorrente; confira o lançamento gerado na seção Lançamentos.</Text>}
        </View>
      </View>)}
      {dailyEvents.length > 70 && <Text style={s.muted}>Exibindo os primeiros 70 eventos.</Text>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 15 },
  heading: { fontSize: 24, fontWeight: '900', color: '#111827' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#ECE8F1', gap: 13 },
  title: { color: '#111827', fontWeight: '800', fontSize: 18 },
  muted: { color: '#6B7280', fontSize: 12, lineHeight: 19 },
  label: { color: '#374151', fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { gap: 6 }, wide: { flexGrow: 2, flexBasis: 220, minWidth: 0 },
  narrow: { flexGrow: 1, flexBasis: 150, minWidth: 0 },
  input: { borderWidth: 1, borderColor: '#DDD6E6', backgroundColor: '#FCFBFD', color: '#111827', borderRadius: 12, minHeight: 46, paddingHorizontal: 13, fontSize: 15 },
  chip: { borderWidth: 1, borderColor: '#DDD6E6', borderRadius: 10, minHeight: 41, paddingHorizontal: 11, paddingVertical: 8, justifyContent: 'center' },
  chipActive: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '700' },
  chipTextActive: { color: '#5B21B6' },
  primary: { alignSelf: 'flex-start', minHeight: 46, backgroundColor: '#7C3AED', paddingHorizontal: 15, borderRadius: 12, justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  disabled: { opacity: 0.5 },
  positive: { fontSize: 13, color: '#15803D' },
  error: { fontSize: 13, color: '#B91C1C' },
  rule: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ECE8F1', paddingVertical: 9 },
  ruleText: { flex: 1, minWidth: 160, gap: 4 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', height: 50, alignItems: 'center', justifyContent: 'center' },
  dayHeader: { color: '#6B7280', fontWeight: '700' },
  dayButton: { minWidth: 36, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: '#7C3AED' },
  dayText: { color: '#374151', fontWeight: '700', fontSize: 13 },
  daySelectedText: { color: '#FFFFFF' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7C3AED' },
  dotSelected: { backgroundColor: '#FFFFFF' },
  event: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#ECE8F1', paddingVertical: 10 },
  dayBadge: { backgroundColor: '#EDE9FE', color: '#5B21B6', fontWeight: '800', padding: 9, borderRadius: 10 },
});
