import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import {
  addGoal, contributeToGoal, setBudget, setPlannerActive, goalProgress, buildInsights,
  validMoney, type PlannerData,
} from '../../services/finance-planner';
import { moeda } from './FinanceVisuals';
import { CATEGORIAS } from '../finance/TransactionForm';

type Props = { data: PlannerData; month: number; year: number; refresh: () => Promise<void> };
const number = (v: string) => Number(v.replace(',', '.'));
function Field({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (s: string) => void; hint?: string;
}) {
  const s = useAccessibleStyles(styles);
  const { isDark } = useAccessibility();
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput style={s.input} value={value} onChangeText={onChange}
      accessibilityLabel={label} placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'}/>
    {hint ? <Text style={s.muted}>{hint}</Text> : null}
  </View>;
}
function Chip({ label, active, press }: { label: string; active?: boolean; press: () => void }) {
  const s = useAccessibleStyles(styles);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }}
    style={[s.chip, active && s.chipActive]} onPress={press}>
    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
  </Pressable>;
}
export function PlannerGoals({ data, month, year, refresh }: Props) {
  const s = useAccessibleStyles(styles);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [initial, setInitial] = useState('0');
  const [contributeId, setContributeId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [category, setCategory] = useState<string>('Alimentação');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const insights = useMemo(() => buildInsights(data), [data]);
  const expenseTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    data.transactions.filter(t => t.tipo === 'despesa').forEach(t => {
      totals[t.categoria] = (totals[t.categoria] || 0) + Number(t.valor);
    });
    return totals;
  }, [data.transactions]);
  async function run(action: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); await refresh(); setMessage(success); }
    catch(e){setError(e instanceof Error ? e.message : 'Não foi possível salvar.');}
    finally { setBusy(false); }
  }
  function saveGoal() {
    const amount = number(goalAmount), saved = number(initial);
    const d = goalDate.trim();
    const dateOk = !d || (/^\d{4}-\d{2}-\d{2}$/.test(d) &&
      !Number.isNaN(new Date(d + 'T12:00:00').valueOf()) &&
      new Date(d + 'T12:00:00').toISOString().slice(0,10) === d);
    if (goalName.trim().length < 2 || goalName.trim().length > 90 ||
      !validMoney(amount) || !Number.isFinite(saved) || saved < 0 || saved > 1e12 || !dateOk) {
      setError('Informe nome, valor positivo e uma data válida (AAAA-MM-DD) ou deixe sem prazo.'); return;
    }
    void run(() => addGoal(goalName, amount, d || null, saved), 'Meta financeira criada.');
    setGoalName(''); setGoalAmount(''); setGoalDate('');
  }
  function saveContribution(id: string) {
    const amount = number(contributeAmount);
    if (!validMoney(amount)) { setError('Informe um valor positivo para a contribuição.'); return; }
    void run(() => contributeToGoal(id, amount), 'Contribuição registrada na meta.');
    setContributeAmount(''); setContributeId(null);
  }
  function saveBudget() {
    const amount = number(budget);
    if (!validMoney(amount)) { setError('Informe um orçamento positivo.'); return; }
    void run(() => setBudget(year, month, category, amount), 'Orçamento atualizado para o mês escolhido.');
    setBudget('');
  }

  return <View style={s.section}>
    <Text style={s.heading}>Metas e orçamento</Text>
    <Text style={s.muted}>Planeje objetivos, registre quanto reservou e defina limites de gastos por categoria. Os valores guardados nas metas são registros de planejamento, não transferências bancárias.</Text>
    <View style={s.card}>
      <Text style={s.title}>Criar meta financeira</Text>
      <View style={s.row}>
        <View style={s.wide}><Field label="Nome da meta (ex.: viagem)" value={goalName} onChange={setGoalName}/></View>
        <View style={s.small}><Field label="Quanto pretende juntar? (R$)" value={goalAmount} onChange={setGoalAmount}/></View>
      </View>
      <View style={s.row}>
        <View style={s.small}><Field label="Quanto já guardou? (R$)" value={initial} onChange={setInitial}/></View>
        <View style={s.small}><Field label="Data desejada (AAAA-MM-DD)" value={goalDate} onChange={setGoalDate} hint="Opcional. Exemplo: 2027-12-31"/></View>
      </View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={saveGoal} style={s.primary}>
        <Text style={s.primaryText}>Criar meta</Text>
      </Pressable>
    </View>
    <View style={s.row}>
      {!data.goals.filter(g => g.active).length && <View style={s.card}><Text style={s.muted}>Você ainda não criou uma meta. Comece pelo formulário acima.</Text></View>}
      {data.goals.filter(g => g.active).map(g => {
        const progress = goalProgress(g, data.contributions);
        const deadline = g.target_date ? new Date(g.target_date + 'T12:00:00') : null;
        const months = deadline ? Math.max(0, (deadline.getFullYear() - new Date().getFullYear()) * 12 +
          deadline.getMonth() - new Date().getMonth()) : 0;
        return <View key={g.id} style={s.goal}>
          <View style={s.rowBetween}>
            <Text style={s.title}>{g.name}</Text>
            <Chip label="Arquivar" press={() => void run(() => setPlannerActive('finance_goals',g.id,false),'Meta arquivada sem apagar contribuições.')}/>
          </View>
          <Text style={s.muted}>Guardado: {moeda(progress.saved)} de {moeda(progress.target)}</Text>
          <View style={s.track}><View style={[s.trackFill,{ width: (progress.percent + '%') as any }]}/></View>
          <Text style={s.big}>{progress.percent.toFixed(0)}% da meta</Text>
          <Text style={s.muted}>Falta reservar {moeda(progress.remaining)}.</Text>
          {g.target_date && <Text style={s.muted}>Prazo: {g.target_date.split('-').reverse().join('/')}{months > 0 ?
            ' · referência de ' + moeda(progress.remaining / months) + ' por mês (sem juros)' :
            ' · prazo atingido ou próximo'}</Text>}
          <View style={s.rowBetween}>
            <Text style={s.label}>Adicionar valor guardado</Text>
            <Chip label={contributeId === g.id ? 'Fechar' : 'Contribuir'} press={() => setContributeId(contributeId === g.id ? null : g.id)}/>
          </View>
          {contributeId === g.id && <View style={s.row}>
            <View style={s.small}><Field label="Valor em R$" value={contributeAmount} onChange={setContributeAmount}/></View>
            <Pressable accessibilityRole="button" style={s.primary} disabled={busy} onPress={() => saveContribution(g.id)}>
              <Text style={s.primaryText}>Registrar</Text>
            </Pressable>
          </View>}
        </View>;
      })}
    </View>
    <View style={s.card}>
      <Text style={s.title}>Orçamento por categoria · {String(month).padStart(2,'0')}/{year}</Text>
      <Text style={s.muted}>Defina quanto deseja gastar em cada categoria neste mês. O app compara o planejado com os lançamentos já registrados.</Text>
      <Text style={s.label}>Categoria</Text>
      <View style={s.row}>{CATEGORIAS.filter(c => c !== 'Salário').map(c => (
        <Chip key={c} label={c} active={category === c} press={() => {
          setCategory(c); setBudget(data.budgets.find(b => b.category === c)?.amount.toString() || '');
        }}/>
      ))}</View>
      <Field label="Valor máximo planejado (R$)" value={budget} onChange={setBudget}/>
      <Pressable accessibilityRole="button" disabled={busy} style={s.primary} onPress={saveBudget}>
        <Text style={s.primaryText}>Salvar orçamento do mês</Text>
      </Pressable>
      {data.budgets.map(b => {
        const spent = Number(expenseTotals[b.category] || 0);
        const pct = spent / Math.max(Number(b.amount),1) * 100;
        return <View key={b.id} style={s.budgetRow}>
          <Text style={s.label}>{b.category}: {moeda(spent)} / {moeda(Number(b.amount))}</Text>
          <View style={s.track}><View style={[s.trackFill, pct > 100 && s.overLimit,
            { width: (Math.min(100,pct) + '%') as any }]}/></View>
          <Text style={pct > 100 ? s.error : s.muted}>{pct.toFixed(0)}% utilizado</Text>
        </View>;
      })}
    </View>
    <View style={s.card}>
      <Text style={s.title}>Insights automáticos</Text>
      <Text style={s.muted}>Análises feitas com seus próprios lançamentos do período escolhido, sem IA externa e sem compartilhar seus dados.</Text>
      {insights.map(item => <View key={item.id} style={s.insight}>
        <Text style={[s.label, item.tone === 'warning' && s.error]}>{item.heading}</Text>
        <Text style={s.muted}>{item.text}</Text>
      </View>)}
      <Text style={s.muted}>Os insights não representam previsão nem recomendação de investimento. As comparações consideram apenas registros disponíveis.</Text>
    </View>
    {!!message && <Text style={s.positive} accessibilityLiveRegion="polite">{message}</Text>}
    {!!error && <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 16 }, heading: { fontSize: 24, color: '#111827', fontWeight: '900' },
  card: { backgroundColor: '#FFFFFF', padding: 17, borderRadius: 18, borderWidth: 1, borderColor: '#ECE8F1', gap: 14 },
  goal: { flexGrow: 1, flexBasis: 270, minWidth: 0, backgroundColor: '#FFFFFF', padding: 17, borderRadius: 18, borderWidth: 1, borderColor: '#ECE8F1', gap: 12 },
  title: { fontSize: 18, color: '#111827', fontWeight: '800', flexShrink: 1 },
  label: { fontSize: 13, color: '#374151', fontWeight: '700' },
  muted: { color: '#6B7280', fontSize: 12, lineHeight: 19 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' },
  rowBetween: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' },
  field: { gap: 6 }, wide: { flexGrow: 2, flexBasis: 240, minWidth: 0 }, small: { flexGrow: 1, flexBasis: 180, minWidth: 0 },
  input: { minHeight: 47, backgroundColor: '#FCFBFD', color: '#111827', borderWidth: 1, borderColor: '#DDD6E6', paddingHorizontal: 13, borderRadius: 12, fontSize: 15 },
  chip: { minHeight: 42, borderRadius: 11, borderWidth: 1, borderColor: '#DDD6E6', paddingHorizontal: 11, paddingVertical: 8, justifyContent: 'center' },
  chipActive: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  chipText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#5B21B6' },
  primary: { alignSelf: 'flex-start', minHeight: 46, backgroundColor: '#7C3AED', paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  track: { backgroundColor: '#EDE9FE', height: 11, borderRadius: 11, overflow: 'hidden' },
  trackFill: { backgroundColor: '#7C3AED', height: '100%', borderRadius: 11 },
  overLimit: { backgroundColor: '#B91C1C' },
  big: { fontSize: 20, color: '#6D28D9', fontWeight: '900' },
  budgetRow: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ECE8F1' },
  insight: { gap: 6, backgroundColor: '#F4F1F8', padding: 13, borderRadius: 12 },
  error: { color: '#B91C1C', fontSize: 13 },
  positive: { color: '#15803D', fontSize: 13 },
});
