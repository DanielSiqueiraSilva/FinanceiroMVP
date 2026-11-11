import { useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { OceanGlass } from '../../design/OceanGlass';
import { OceanHero } from './OceanHero';
import { PaymentReminders } from '../finance/PaymentReminders';
import { MonthlyOverview } from '../finance/MonthlyOverview';
import { moeda } from '../workspace/FinanceVisuals';
import { goalProgress, type PlannerData, type RecurringRule } from '../../services/finance-planner';
import type { Lancamento, ResumoFinanceiro } from '../../types/finance';
import { categorySpending, latestTransactions, plannerBalances, fourWeekFlow } from './dashboard-data';
import { OceanButton } from '../../design/OceanControls';

type Destination = 'lancamentos' | 'contas' | 'automacao' | 'metas' | 'graficos' | 'planos';
type Forecast = { rule: RecurringRule; posted: boolean };
type Props = {
  resumo: ResumoFinanceiro | null;
  lancamentos: Lancamento[];
  planner: PlannerData | null;
  forecasts: Forecast[];
  mes: number;
  ano: number;
  limite: number;
  salvandoLimite: boolean;
  onSalvarLimite: (valor: number) => Promise<void>;
  onNavigate: (target: Destination) => void;
};

const sky = '#BDE9F2';
const navy = '#082840';
const aqua = '#08E5D8';
function Panel({ title, link, onLink, children, dark = true, style }: {
  title: string; link?: string; onLink?: () => void;
  children: ReactNode; dark?: boolean; style?: ViewStyle;
}) {
  return (
    <OceanGlass material="soft" dark={dark} radius={19} style={[styles.panel, style]}>
      <View style={styles.panelHeading}>
        <Text accessibilityRole="header" style={[styles.panelTitle,
          { color: dark ? '#F2FCFF' : '#0B304B' }]}>{title}</Text>
        {link && onLink && <Pressable onPress={onLink} accessibilityRole="button"
          accessibilityLabel={link} style={styles.linkButton}>
          <Text style={[styles.panelLink, { color: dark ? '#74F9F1' : '#006A89' }]}>
            {link}  ›
          </Text>
        </Pressable>}
      </View>
      {children}
    </OceanGlass>
  );
}
function StatCard({ type, amount, hidden, dark }: {
  type: 'receita' | 'despesa'; amount: number | null; hidden: boolean; dark: boolean;
}) {
  const income = type === 'receita';
  const label = income ? 'Receitas do mês' : 'Despesas do mês';
  const text = amount === null ? 'Indisponível' : hidden ? 'R$ •••••' : moeda(amount);
  return <View accessible accessibilityLabel={label + ': ' +
    (amount === null ? 'indisponível' : hidden ? 'valor oculto' : moeda(amount))}
    style={[styles.stat, {
      backgroundColor: income ?
        dark ? 'rgba(0,108,111,.32)' : '#E7FCF7' :
        dark ? 'rgba(91,48,91,.32)' : '#FFF0F3',
      borderColor: income ? 'rgba(12,219,202,.34)' : 'rgba(224,141,164,.31)',
    }]}>
    <Text style={[styles.statLabel, { color: dark ? sky : '#527284' }]}>
      {income ? '↗' : '↘'} {label}
    </Text>
    <Text style={[styles.statValue, { color: dark ? '#FFFFFF' : '#0B304B' }]}
      adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2}>{text}</Text>
    <Text style={[styles.statHint, { color: income ? dark ? '#7BE9D6' : '#096D61' :
      dark ? '#F6A9C4' : '#A54459' }]}>
      {income ? 'Entradas registradas' : 'Saídas registradas'}
    </Text>
  </View>;
}
function FlowBars({ transactions, hidden, dark }: {
  transactions: readonly Lancamento[]; hidden: boolean; dark: boolean;
}) {
  const [selected, setSelected] = useState<'income' | 'expense'>('income');
  const data = useMemo(() => fourWeekFlow(transactions), [transactions]);
  const maximum = Math.max(1, ...data.map(x => x[selected]));
  return <Panel title="▥ Evolução do mês" dark={dark}>
    <View style={styles.segment} accessibilityRole="tablist">
      {([{id:'income',text:'Receitas'},{id:'expense',text:'Despesas'}] as const).map(opt=>
        <Pressable key={opt.id} accessibilityRole="tab" accessibilityLabel={opt.text}
          accessibilityState={{ selected: selected === opt.id }}
          onPress={() => setSelected(opt.id)} style={[styles.segmentButton,
            selected === opt.id && styles.segmentSelected]}>
          <Text style={[styles.segmentText,
            { color: selected === opt.id ? '#022D46' : dark ? '#DAF3FA' : '#456879' }]}>
            {opt.text}
          </Text>
        </Pressable>)}
    </View>
    {transactions.length === 0 ?
      <Text style={[styles.empty, { color: dark ? sky : '#4D7183' }]}>
        Registre uma receita ou despesa para visualizar a evolução.
      </Text> :
      hidden ? <View style={styles.emptyGraph}>
        <Text style={{ color: dark ? sky : '#4D7183', fontSize: 12 }}>
          Evolução oculta para proteger seus valores.
        </Text>
      </View> :
      <View accessible accessibilityLabel={'Gráfico ' + (selected === 'income' ? 'de receitas' : 'de despesas') +
          ': ' + data.map((w, i) => 'semana '+(i+1)+' '+moeda(w[selected])).join(', ')}>
        <View style={[styles.chart, { borderBottomColor: dark ? '#49788C' : '#C1DCE8' }]}>
          {data.map((item, index) => <View key={item.index} style={styles.chartColumn}>
            <View style={[styles.bar, { height: Math.max(3, item[selected] / maximum * 106),
              backgroundColor: selected === 'income' ? '#08DCCD' : '#168CC8' }]}/>
            <Text style={[styles.tick, { color: dark ? '#A8D6E2' : '#537A89' }]}>
              Sem {index+1}</Text>
          </View>)}
        </View>
      </View>}
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: selected === 'income' ? aqua : '#128CC9' }]}/>
      <Text style={[styles.tiny, { color: dark ? sky : '#526D7D' }]}>
        {selected === 'income' ? 'Receitas' : 'Despesas'} · lançamentos registrados
      </Text>
    </View>
  </Panel>;
}
function GoalPanel({ planner, hidden, dark, onNavigate }: {
  planner: PlannerData | null; hidden: boolean; dark: boolean; onNavigate: () => void;
}) {
  const goal = planner?.goals.find(g => g.active);
  const progress = goal && planner ? goalProgress(goal, planner.contributions) : null;
  return <Panel title="◎ Meta e planejamento" link="Ver metas"
    onLink={onNavigate} dark={dark}>
    {goal && progress ? <>
      <Text style={[styles.bodyBold, { color: dark ? '#F3FBFF' : '#08314A' }]}>
        {goal.name}</Text>
      <View style={styles.track}><View style={[styles.trackFill,
        { width: (hidden ? 0 : Math.max(0, Math.min(100, progress.percent))) + '%' as `${number}%` }]}/></View>
      <View style={styles.between}>
        <Text style={[styles.tiny, { color: dark ? sky : '#537486' }]}>
          {hidden ? 'Valor oculto' : moeda(progress.saved) + ' de ' + moeda(progress.target)}
        </Text>
        <Text style={[styles.tiny, { color: dark ? sky : '#537486' }]}>
          {hidden ? '—' : Math.round(progress.percent) + '%'}
        </Text>
      </View>
    </> : <Pressable onPress={onNavigate} accessibilityRole="button">
      <Text style={[styles.empty, { color: dark ? sky : '#537486' }]}>
        {planner ? 'Crie uma meta para acompanhar seu progresso.' :
          'As metas ainda não foram carregadas.'}
      </Text>
    </Pressable>}
  </Panel>;
}
function BudgetPanel({ spent, limit, planner, onNavigate, hidden, dark,
  salvandoLimite, onSalvarLimite, monthKey }: {
  spent: number; limit: number; planner: PlannerData | null;
  onNavigate: () => void; hidden: boolean; dark: boolean;
  salvandoLimite: boolean; onSalvarLimite: (value: number) => Promise<void>;
  monthKey: string;
}) {
  const [expanded, setExpanded] = useState(false);
  // The global monthly limit is distinct from category budgets.
  const categories = planner?.budgets.filter(x => x.amount > 0) ?? [];
  const allocated = categories.reduce((s, b) => s + Number(b.amount), 0);
  const used = limit > 0 ? Math.round(spent / limit * 100) : null;
  return <Panel title="◉ Orçamento do mês"
    link={expanded ? 'Fechar detalhes' : 'Ver detalhes'}
    onLink={() => setExpanded(!expanded)} dark={dark}>
    {limit > 0 ? <>
      <Text style={[styles.tiny, { color: dark ? sky : '#537486' }]}>
        {hidden ? 'Valores ocultos' : moeda(spent) + ' de ' + moeda(limit)}
      </Text>
      <View style={styles.track}><View style={[styles.budgetFill,
        { width: (hidden ? 0 : Math.max(0, Math.min(100, used ?? 0))) + '%' as `${number}%`,
          backgroundColor: spent > limit ? '#E29DAF' : '#09D7CA' }]}/></View>
      <Text style={[styles.tiny, { color: dark ? sky : '#537486' }]}>
        {hidden ? 'Progresso oculto' : used + '% do limite mensal utilizado'}
      </Text>
      {allocated > 0 && <Text style={[styles.tiny, { color: dark ? sky : '#537486' }]}>
        {categories.length} categorias com orçamento definido
      </Text>}
    </> : <Pressable accessibilityRole="button" onPress={onNavigate}>
      <Text style={[styles.empty, { color: dark ? sky : '#537486' }]}>
        Defina um orçamento mensal para acompanhar seus gastos.
      </Text>
    </Pressable>}
    {expanded && <View style={styles.budgetEditor}>
      <MonthlyOverview key={monthKey} totalDespesas={spent}
        limite={limit} salvando={salvandoLimite}
        onSalvarLimite={onSalvarLimite}/>
    </View>}
    <Pressable accessibilityRole="button" onPress={onNavigate}
      style={styles.budgetCategoriesLink}>
      <Text style={[styles.tiny,{color:dark?'#72FFF2':'#006A89',fontWeight:'800'}]}>
        Planejar por categoria  ›
      </Text>
    </Pressable>
  </Panel>;
}

/** Real-data implementation of the supplied HTML visual model. */
export function OceanPrototypeDashboard({
  resumo, lancamentos, planner, forecasts, mes, ano, limite,
  salvandoLimite, onSalvarLimite, onNavigate,
}: Props) {
  const { isDark } = useAccessibility();
  const [hidden, setHidden] = useState(false);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const wide = layoutWidth >= 720;
  const dark = isDark;
  const period = String(mes).padStart(2,'0') + '/' + ano;
  const balances = useMemo(() => plannerBalances(planner), [planner]);
  const recent = useMemo(() => latestTransactions(lancamentos, 3), [lancamentos]);
  const categories = useMemo(() => categorySpending(lancamentos), [lancamentos]);
  const outstanding = planner?.cardOverview.reduce((sum, item) =>
    sum + Number(item.unpaid_total), 0) ?? null;
  const upcoming = forecasts.filter(f => !f.posted).slice(0, 2);
  const show = (value: number | null) => value === null ? 'Indisponível' :
    hidden ? 'R$ •••••' : moeda(value);
  return <View onLayout={e => setLayoutWidth(e.nativeEvent.layout.width)}
    style={styles.root} testID="oceafin-prototype-dashboard">
    <View style={[styles.firstRow, !wide && styles.stack]}>
      <View style={styles.heroSpace}>
        <OceanHero balance={balances.accountTotal} monthResult={resumo?.saldo ?? null}
          prototype period={period} hidden={hidden} onToggle={() => setHidden(!hidden)}
          onAccounts={() => onNavigate('contas')}/>
      </View>
      <View style={[styles.statStack, !wide && styles.statsHorizontal]}>
        <StatCard type="receita" amount={resumo?.totalReceitas ?? null}
          hidden={hidden} dark={dark}/>
        <StatCard type="despesa" amount={resumo?.totalDespesas ?? null}
          hidden={hidden} dark={dark}/>
      </View>
    </View>
    <View style={[styles.twoColumns, !wide && styles.stack]}>
      <View style={styles.column}>
        <FlowBars transactions={lancamentos} hidden={hidden} dark={dark}/>
      </View>
      <View style={styles.column}>
        <PaymentReminders month={mes} year={ano} compact hidden={hidden} />
      </View>
    </View>
    <View style={[styles.twoColumns, !wide && styles.stack]}>
      <View style={styles.column}><GoalPanel planner={planner} hidden={hidden}
        dark={dark} onNavigate={() => onNavigate('metas')}/></View>
      <View style={styles.column}><BudgetPanel
        spent={resumo?.totalDespesas ?? 0} limit={limite} planner={planner}
        dark={dark} hidden={hidden} monthKey={period}
        salvandoLimite={salvandoLimite} onSalvarLimite={onSalvarLimite}
        onNavigate={() => onNavigate('metas')}/></View>
    </View>
    <View style={[styles.twoColumns, !wide && styles.stack]}>
      <View style={styles.column}>
        <Panel title="▣ Contas e cartões" link="Ver contas"
          onLink={() => onNavigate('contas')} dark={dark}>
          <View style={styles.miniRow}>
            <Text style={[styles.tiny, { color: dark ? sky : '#527486' }]}>
              Compras pendentes nos cartões</Text>
            <Text style={[styles.miniValue, { color: dark ? '#E3FFFF' : '#07324A' }]}>
              {show(outstanding)}</Text>
          </View>
          <Text style={[styles.tiny, { color: dark ? sky : '#527486' }]}>
            Valor registrado no app; não é a fatura oficial do banco.
          </Text>
        </Panel>
      </View>
      <View style={styles.column}>
        <Panel title="⟳ Automações" link="Abrir calendário"
          onLink={() => onNavigate('automacao')} dark={dark}>
          {upcoming.length ? upcoming.map(({rule}) => <View key={rule.id}
            style={styles.miniRow}>
            <Text style={[styles.tiny, { color: dark ? sky : '#527486', flex: 1 }]}>
              Dia {rule.day_of_month} · {rule.description}</Text>
            <Text style={[styles.miniValue, { color: dark ? '#E3FFFF' : '#07324A' }]}>
              {show(rule.amount)}</Text>
          </View>) : <Text style={[styles.empty, { color: dark ? sky : '#527486' }]}>
            Nenhuma recorrência prevista para este mês.
          </Text>}
        </Panel>
      </View>
    </View>
    <Panel title="▤ Últimos lançamentos" dark={dark}
      link="Ver todos" onLink={() => onNavigate('lancamentos')}>
      {recent.length ? recent.map(tx => <View key={tx.id} style={styles.transaction}>
        <View style={[styles.transactionIcon, { backgroundColor:
          tx.tipo === 'receita' ? '#0A7F80' : '#37688F' }]}>
          <Text style={styles.transactionIconText}>{tx.tipo === 'receita' ? '↗' : '↘'}</Text>
        </View>
        <View style={styles.transactionCopy}>
          <Text style={[styles.bodyBold, { color: dark ? '#F3FBFF' : '#08314A' }]}
            numberOfLines={2}>{tx.descricao}</Text>
          <Text style={[styles.tiny, { color: dark ? sky : '#527486' }]}>
            {tx.categoria} · {tx.data.slice(8,10)}/{tx.data.slice(5,7)}
          </Text>
        </View>
        <Text style={[styles.miniValue, { color: tx.tipo === 'receita' ?
          dark ? '#72F9DD' : '#0C7866' : dark ? '#D6EEFF' : '#265975' }]}>
          {show(tx.valor)}</Text>
      </View>) : <Text style={[styles.empty,{color:dark?sky:'#527486'}]}>
        Nenhum lançamento neste período.</Text>}
      {categories.length > 0 && !hidden && <Text style={[styles.tiny,
        {color:dark?sky:'#527486'}]}>
        Maior categoria de gastos: {categories[0].categoria} · {moeda(categories[0].valor)}
      </Text>}
    </Panel>
    <View style={styles.addRow}>
      <OceanButton variant="primary" label="Novo lançamento" icon="lancamentos"
        onPress={() => onNavigate('lancamentos')}/>
    </View>
    <Text style={[styles.disclaimer,{color:dark?sky:'#527486'}]}>
      Dados do período {period}. O saldo de contas é estimado a partir dos registros;
      pagamentos, recorrências previstas e metas não representam transações bancárias.
    </Text>
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: 15, width: '100%', paddingBottom: 8 },
  addRow: { alignItems: 'flex-start' },
  firstRow: { flexDirection: 'row', gap: 15, alignItems: 'stretch' },
  heroSpace: { flex: 1.65, minWidth: 0 },
  statStack: { flex: 0.9, minWidth: 0, gap: 12 },
  statsHorizontal: { flexDirection: 'row', flex: 0, flexWrap: 'wrap' },
  stack: { flexDirection: 'column' },
  stat: { minWidth: 0, flex: 1, borderRadius: 20, borderWidth: 1,
    padding: 18, gap: 7, justifyContent: 'space-between' },
  statLabel: { fontSize: 12, fontWeight: '700' },
  statValue: { fontWeight: '900', fontSize: 22,
    fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined },
  statHint: { fontSize: 10.5, fontWeight: '700' },
  twoColumns: { flexDirection: 'row', gap: 15 },
  column: { flex: 1, minWidth: 0 },
  panel: { padding: 18, gap: 12, minHeight: 138 },
  panelHeading: { flexDirection: 'row', flexWrap: 'wrap', gap: 7,
    alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontSize: 15, fontWeight: '900',
    fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined },
  linkButton: { paddingHorizontal: 4, minHeight: 42, justifyContent: 'center' },
  panelLink: { fontSize: 11, fontWeight: '800' },
  segment: { flexDirection: 'row', gap: 2, alignSelf: 'flex-end',
    borderRadius: 20, backgroundColor: 'rgba(14,61,84,.48)',
    borderWidth: 1, borderColor: '#48889C', padding: 3 },
  segmentButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center' },
  segmentSelected: { backgroundColor: '#07CCDE' },
  segmentText: { fontSize: 11, fontWeight: '800' },
  chart: { height: 155, borderBottomWidth: 1, flexDirection: 'row',
    gap: 12, justifyContent: 'space-around', alignItems: 'flex-end', paddingTop: 10 },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end',
    height: '100%', gap: 6 },
  bar: { width: '58%', maxWidth: 40, borderTopLeftRadius: 6,
    borderTopRightRadius: 6 },
  tick: { fontSize: 10, marginBottom: 5 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  tiny: { fontSize: 11, lineHeight: 18 },
  bodyBold: { fontSize: 12, fontWeight: '800' },
  track: { height: 10, backgroundColor: 'rgba(107,201,221,.20)',
    borderRadius: 10, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: '#37E6DB', borderRadius: 10 },
  budgetFill: { height: '100%', borderRadius: 10 },
  between: { flexDirection: 'row', justifyContent: 'space-between',
    gap: 9, flexWrap: 'wrap' },
  empty: { fontSize: 12, lineHeight: 19, paddingVertical: 12 },
  emptyGraph: { height: 150, justifyContent: 'center', alignItems: 'center' },
  budgetEditor: { paddingTop: 8 },
  budgetCategoriesLink: { minHeight: 40, alignSelf: 'flex-start', justifyContent: 'center' },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 12,
    justifyContent: 'space-between', flexWrap: 'wrap' },
  miniValue: { fontSize: 13, fontWeight: '900' },
  transaction: { flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 7 },
  transactionCopy: { flex: 1, minWidth: 0, gap: 4 },
  transactionIcon: { width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center' },
  transactionIconText: { fontSize: 18, color: '#FFFFFF', fontWeight: '900' },
  disclaimer: { fontSize: 11, lineHeight: 19 },
});
