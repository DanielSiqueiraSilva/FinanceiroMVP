import { useMemo, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useOceanViewport } from '../../design/useOceanViewport';
import { OceanPressable as Pressable } from '../../design/OceanControls';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { OceanGlass } from '../../design/OceanGlass';
import { OceanHero } from './OceanHero';
import { PaymentReminders } from '../finance/PaymentReminders';
import { MonthlyOverview } from '../finance/MonthlyOverview';
import { moeda } from '../workspace/FinanceVisuals';
import { goalProgress, type PlannerData, type RecurringRule } from '../../services/finance-planner';
import type { Lancamento, ResumoFinanceiro } from '../../types/finance';
import { categorySpending, latestTransactions, plannerBalances, fourWeekFlow } from './dashboard-data';
import { OceanButton, OceanSegmentedControl } from '../../design/OceanControls';

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
  onNewTransaction?: () => void;
  onQuickTransaction?: (kind: 'receita' | 'despesa') => void;
};

const sky = '#BDE9F2';
const navy = '#082840';
const aqua = '#30B8BD';
const FLOW_OPTIONS = [
  { value: 'income', label: 'Receitas' },
  { value: 'expense', label: 'Despesas' },
] as const;
function Panel({ title, link, onLink, children, dark = true, style, fill = false }: {
  title: string; link?: string; onLink?: () => void;
  children: ReactNode; dark?: boolean; style?: ViewStyle; fill?: boolean;
}) {
  return (
    <OceanGlass material="soft" dark={dark} radius={19} style={[styles.panel, fill && styles.panelFill, style]}>
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
function StatCard({ type, amount, hidden, dark, compact }: {
  type: 'receita' | 'despesa'; amount: number | null; hidden: boolean; dark: boolean;
  compact: boolean;
}) {
  const income = type === 'receita';
  const label = income ? 'Receitas do mês' : 'Despesas do mês';
  const text = amount === null ? 'Indisponível' : hidden ? 'R$ •••••' : moeda(amount);
  return <View accessible testID={'oceafin-stat-'+type}
    accessibilityLabel={label + ': ' +
    (amount === null ? 'indisponível' : hidden ? 'valor oculto' : moeda(amount))}
    style={[styles.stat, compact && styles.statCompact, {
      backgroundColor: income ?
        dark ? 'rgba(0,108,111,.32)' : '#E7FCF7' :
        dark ? 'rgba(91,48,91,.32)' : '#FFF0F3',
      borderColor: income ? 'rgba(12,219,202,.34)' : 'rgba(224,141,164,.31)',
    }]}>
    <Text style={[styles.statLabel, { color: dark ? sky : '#527284' }]}>
      {income ? '↗' : '↘'} {label}
    </Text>
    <Text style={[styles.statValue, compact && styles.statValueCompact, { color: dark ? '#FFFFFF' : '#0B304B' }]}
      adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>{text}</Text>
    <Text style={[styles.statHint, { color: income ? dark ? '#7BE9D6' : '#096D61' :
      dark ? '#F6A9C4' : '#A54459' }]}>
      {income ? 'Entradas registradas' : 'Saídas registradas'}
    </Text>
  </View>;
}
function FlowBars({ transactions, hidden, dark, fill }: {
  transactions: readonly Lancamento[]; hidden: boolean; dark: boolean; fill: boolean;
}) {
  const [selected, setSelected] = useState<'income' | 'expense'>('income');
  const data = useMemo(() => fourWeekFlow(transactions), [transactions]);
  const maximum = Math.max(1, ...data.map(x => x[selected]));
  return <Panel title="Evolução do mês" dark={dark} fill={fill} style={styles.evolutionPanel}>
    <OceanSegmentedControl value={selected}
      options={FLOW_OPTIONS} onChange={setSelected}/>
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
              backgroundColor: selected === 'income' ? '#37B5B8' : '#2E94BA' }]}/>
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
function GoalPanel({ planner, hidden, dark, onNavigate, fill }: {
  planner: PlannerData | null; hidden: boolean; dark: boolean; onNavigate: () => void; fill: boolean;
}) {
  const goal = planner?.goals.find(g => g.active);
  const progress = goal && planner ? goalProgress(goal, planner.contributions) : null;
  return <Panel title="Meta e planejamento" link="Ver metas"
    onLink={onNavigate} dark={dark} fill={fill}>
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
    </> : <View style={styles.emptyState}>
      <Text style={[styles.tiny, { color: dark ? sky : '#537486' }]}>
        {planner ? 'Acompanhe seus objetivos em um só lugar.' :
          'Suas metas aparecerão aqui quando estiverem disponíveis.'}
      </Text>
      <Pressable onPress={onNavigate} accessibilityRole="button"
        style={[styles.emptyCta, {borderColor:dark?'rgba(135,234,228,.30)':'#B1DCE2'}]}>
        <Text style={[styles.emptyActionText,{color:dark?'#8AF0E8':'#087488'}]}>
          {planner ? '+ Criar primeira meta  ›' : 'Ver planejamento  ›'}
        </Text>
      </Pressable>
    </View>}
  </Panel>;
}
function BudgetPanel({ spent, limit, planner, onNavigate, hidden, dark,
  salvandoLimite, onSalvarLimite, monthKey, fill }: {
  spent: number; limit: number; planner: PlannerData | null;
  onNavigate: () => void; hidden: boolean; dark: boolean;
  salvandoLimite: boolean; onSalvarLimite: (value: number) => Promise<void>;
  monthKey: string; fill: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // The global monthly limit is distinct from category budgets.
  const categories = planner?.budgets.filter(x => x.amount > 0) ?? [];
  const allocated = categories.reduce((s, b) => s + Number(b.amount), 0);
  const used = limit > 0 ? Math.round(spent / limit * 100) : null;
  return <Panel title="Orçamento do mês"
    link={expanded ? 'Fechar detalhes' : 'Ver detalhes'}
    onLink={() => setExpanded(!expanded)} dark={dark} fill={fill}>
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
    </> : <View style={styles.emptyState}>
      <Text style={[styles.tiny, {color:dark?sky:'#537486'}]}>
        Defina um limite para saber quanto ainda pode gastar neste mês.
      </Text>
      <Pressable accessibilityRole="button" onPress={() => setExpanded(true)}
        style={[styles.emptyCta,{borderColor:dark?'rgba(135,234,228,.30)':'#B1DCE2'}]}>
        <Text style={[styles.emptyActionText,{color:dark?'#8AF0E8':'#087488'}]}>
          + Definir limite mensal  ›
        </Text>
      </Pressable>
    </View>}
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
  salvandoLimite, onSalvarLimite, onNavigate, onNewTransaction, onQuickTransaction,
}: Props) {
  const { isDark } = useAccessibility();
  const [hidden, setHidden] = useState(false);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const viewportWidth = useOceanViewport();
  // Expo Web may report zero from onLayout initially; do not collapse the mobile
  // card columns or force a desktop layout in a narrow container.
  const wide = viewportWidth >= 1100 && (layoutWidth === 0 || layoutWidth >= 720);
  const compact = (layoutWidth || viewportWidth) < 350;
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
    <View style={[styles.firstRow, !wide && styles.firstRowMobile]}
      testID="oceafin-dashboard-summary">
      <View style={wide ? styles.heroSpace : styles.heroSpaceMobile}>
        <OceanHero balance={balances.accountTotal} monthResult={resumo?.saldo ?? null}
          prototype fillHeight={wide} period={period} hidden={hidden}
          onToggle={() => setHidden(!hidden)} onAccounts={() => onNavigate('contas')}/>
      </View>
      <View style={wide ? styles.statStack : styles.statStackMobile}>
        <StatCard type="receita" amount={resumo?.totalReceitas ?? null}
          hidden={hidden} dark={dark} compact={compact}/>
        <StatCard type="despesa" amount={resumo?.totalDespesas ?? null}
          hidden={hidden} dark={dark} compact={compact}/>
      </View>
    </View>
    <View style={styles.quickActions} testID="oceafin-dashboard-quick-actions">
      <View style={styles.quickCopy}>
        <Text style={[styles.quickHeading,{color:dark?'#F3FBFF':'#0B304B'}]}>
          Ações rápidas
        </Text>
        {wide && <Text style={[styles.tiny,{color:dark?sky:'#527486'}]}>
          Registre suas movimentações sem sair da visão geral.
        </Text>}
      </View>
      <View style={[styles.quickButtons,!wide && styles.quickButtonsMobile]}>
        <View style={styles.quickActionCell}>
          <OceanButton fullWidth variant="glass" label="+ Receita"
            onPress={() => onQuickTransaction ?
              onQuickTransaction('receita') : onNavigate('lancamentos')}/>
        </View>
        <View style={styles.quickActionCell}>
          <OceanButton fullWidth variant="glass" label="− Despesa"
            onPress={() => onQuickTransaction ?
              onQuickTransaction('despesa') : (onNewTransaction ?
                onNewTransaction() : onNavigate('lancamentos'))}/>
        </View>
        {wide && <Pressable accessibilityRole="button" onPress={() => onNavigate('lancamentos')}
          style={styles.quickTextLink}>
          <Text style={[styles.panelLink,{color:dark?'#8AF0E8':'#087488'}]}>
            Ver lançamentos ›
          </Text>
        </Pressable>}
      </View>
    </View>
    <View style={[styles.twoColumns,!wide && styles.stack]}
      testID="oceafin-dashboard-flow-reminders">
      <View style={wide ? styles.column : styles.columnMobile}>
        <FlowBars transactions={lancamentos} hidden={hidden} dark={dark} fill={wide}/>
      </View>
      <View style={wide ? styles.column : styles.columnMobile}>
        <PaymentReminders month={mes} year={ano} compact hidden={hidden} stretch={wide}/>
      </View>
    </View>
    <View style={[styles.twoColumns,!wide && styles.stack]}>
      <View style={wide ? styles.column : styles.columnMobile}>
        <GoalPanel planner={planner} hidden={hidden} dark={dark}
          fill={wide} onNavigate={() => onNavigate('metas')}/>
      </View>
      <View style={wide ? styles.column : styles.columnMobile}>
        <BudgetPanel spent={resumo?.totalDespesas ?? 0} limit={limite} planner={planner}
          dark={dark} hidden={hidden} monthKey={period} fill={wide}
          salvandoLimite={salvandoLimite} onSalvarLimite={onSalvarLimite}
          onNavigate={() => onNavigate('metas')}/>
      </View>
    </View>
    <View style={[styles.twoColumns,!wide && styles.stack]}>
      <View style={wide ? styles.column : styles.columnMobile}>
        <Panel title="Contas e cartões" link="Ver contas" fill={wide}
          onLink={() => onNavigate('contas')} dark={dark}>
          <View style={styles.miniRow}>
            <Text style={[styles.tiny,{color:dark?sky:'#527486'}]}>
              Compras pendentes nos cartões</Text>
            <Text style={[styles.miniValue,{color:dark?'#E3FFFF':'#07324A'}]}>
              {show(outstanding)}</Text>
          </View>
          <Text style={[styles.tiny,{color:dark?sky:'#527486'}]}>
            Valor registrado no app; não é a fatura oficial do banco.
          </Text>
        </Panel>
      </View>
      <View style={wide ? styles.column : styles.columnMobile}>
        <Panel title="Automações" link="Abrir calendário" fill={wide}
          onLink={() => onNavigate('automacao')} dark={dark}>
          {upcoming.length ? upcoming.map(({rule}) => <View key={rule.id}
            style={styles.miniRow}>
            <Text style={[styles.tiny,{color:dark?sky:'#527486',flex:1}]}>
              Dia {rule.day_of_month} · {rule.description}</Text>
            <Text style={[styles.miniValue,{color:dark?'#E3FFFF':'#07324A'}]}>
              {show(rule.amount)}</Text>
          </View>) : <Text style={[styles.empty,{color:dark?sky:'#527486'}]}>
            Nenhuma recorrência prevista para este mês.
          </Text>}
        </Panel>
      </View>
    </View>
    <Panel title="Últimos lançamentos" dark={dark}
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
    <Text style={[styles.disclaimer,{color:dark?sky:'#527486'}]}>
      Dados do período {period}. O saldo de contas é estimado a partir dos registros;
      pagamentos, recorrências previstas e metas não representam transações bancárias.
    </Text>
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: 16, width: '100%', paddingBottom: 10 },
  firstRow: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  firstRowMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 12,
    flexGrow: 0, flexShrink: 0 },
  heroSpace: { flex: 1.65, minWidth: 0 },
  heroSpaceMobile: { width: '100%', flexGrow: 0, flexShrink: 0 },
  statStack: { flex: 0.9, minWidth: 0, gap: 12 },
  statStackMobile: { flexDirection: 'row', flexGrow: 0, flexShrink: 0,
    width: '100%', alignItems: 'stretch', gap: 10 },
  stack: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  stat: { minWidth: 0, flex: 1, borderRadius: 18, borderWidth: 1,
    paddingHorizontal: 17, paddingVertical: 15, gap: 6,
    justifyContent: 'space-between', minHeight: 98 },
  statCompact: { paddingHorizontal: 12, paddingVertical: 13, minHeight: 110 },
  statLabel: { fontSize: 12, fontWeight: '700' },
  statValue: { fontWeight: '900', fontSize: 22,
    fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined },
  statValueCompact: { fontSize: 16 },
  statHint: { fontSize: 10.5, fontWeight: '700' },
  quickActions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap',
    alignItems: 'center', justifyContent: 'space-between', paddingVertical: 1 },
  quickCopy: { gap: 4, flexGrow: 0, minWidth: 0 },
  quickHeading: { fontSize: 14, fontWeight: '800' },
  quickButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, alignItems: 'center' },
  quickButtonsMobile: { width: '100%', flexWrap: 'nowrap' },
  quickActionCell: { minWidth: 110, flexGrow: 1, flexBasis: 110 },
  quickTextLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  twoColumns: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  column: { flex: 1, minWidth: 0, alignSelf: 'stretch' },
  columnMobile: { width: '100%', flexGrow: 0, flexShrink: 0 },
  panel: { padding: 18, gap: 10, minHeight: 155 },
  panelFill: { flex: 1 },
  evolutionPanel: { minHeight: 224 },
  panelHeading: { flexDirection: 'row', flexWrap: 'wrap', gap: 7,
    alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontSize: 15, fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined },
  linkButton: { paddingHorizontal: 6, minHeight: 38, justifyContent: 'center',
    borderRadius: 10 },
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
  emptyState: { gap: 10, paddingVertical: 5 },
  emptyCta: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999,
    minHeight: 38, paddingHorizontal: 12, justifyContent: 'center' },
  emptyActionText: { fontSize: 11, fontWeight: '800' },
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
