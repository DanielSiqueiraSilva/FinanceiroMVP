import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { WorkspaceIcon, type WorkspaceIconName } from '../../design/brand';
import { OceanHero } from './OceanHero';
import { OceanFlowChart } from './OceanFlowChart';
import { getOceafinTheme, OCEAFIN } from '../../design/tokens';
import type { Lancamento, ResumoFinanceiro } from '../../types/finance';
import type { PlannerData, RecurringRule } from '../../services/finance-planner';
import { MonthlyOverview } from '../finance/MonthlyOverview';
import { PaymentReminders } from '../finance/PaymentReminders';
import { moeda } from '../workspace/FinanceVisuals';
import { categorySpending, latestTransactions, plannerBalances } from './dashboard-data';

export type DashboardDestination = 'lancamentos' | 'contas' | 'automacao' |
  'metas' | 'graficos' | 'planos';

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
  onNavigate: (target: DashboardDestination) => void;
};

const SHORTCUTS: { id: DashboardDestination; titulo: string; legenda: string }[] = [
  { id: 'lancamentos', titulo: 'Lançamentos', legenda: 'Receitas e despesas' },
  { id: 'contas', titulo: 'Contas e cartões', legenda: 'Seu dinheiro organizado' },
  { id: 'automacao', titulo: 'Automações', legenda: 'Contas que se repetem' },
  { id: 'metas', titulo: 'Metas', legenda: 'Objetivos e orçamento' },
  { id: 'graficos', titulo: 'Gráficos', legenda: 'Entenda suas tendências' },
  { id: 'planos', titulo: 'Planos futuros', legenda: 'Simule possibilidades' },
];

function SectionHeading({ overline, title, subtitle }: {
  overline: string; title: string; subtitle?: string;
}) {
  const s = useAccessibleStyles(styles);
  const { isDark } = useAccessibility();
  const t = getOceafinTheme(isDark);
  return (
    <View style={s.sectionHeading}>
      <Text style={[s.kicker, { color: t.link }]}>{overline}</Text>
      <Text style={[s.sectionTitle, { color: t.text }]} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={[s.helper, { color: t.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

function AmountCard({ title, value, hint, tone, hidden = false }: {
  title: string; value: number; hint: string; tone: 'income' | 'expense'; hidden?: boolean;
}) {
  const s = useAccessibleStyles(styles);
  const { isDark } = useAccessibility();
  const t = getOceafinTheme(isDark);
  const amountColor = tone === 'income'
    ? isDark ? '#88E8CE' : '#116F5A'
    : isDark ? '#FFC1B7' : '#AB493C';
  return (
    <View style={[s.amountCard, { backgroundColor: t.surface, borderColor: t.border }]}
      accessible accessibilityLabel={title + ': ' + moeda(value) + '. ' + hint}>
      <View style={[s.amountAccent, { backgroundColor: amountColor }]} />
      <Text style={[s.amountLabel, { color: t.muted }]}>{title}</Text>
      <Text style={[s.amountValue, { color: amountColor }]} adjustsFontSizeToFit
        minimumFontScale={0.75} numberOfLines={2}>{hidden ? 'R$ •••••' : moeda(value)}</Text>
      <Text style={[s.caption, { color: t.muted }]}>{hint}</Text>
    </View>
  );
}

function LinkedAccountCard({ title, value, hint, onPress, icon, hidden = false }: {
  title: string; value: number | null; hint: string;
  onPress: () => void; icon: 'contas' | 'automacao'; hidden?: boolean;
}) {
  const s = useAccessibleStyles(styles);
  const { isDark } = useAccessibility();
  const t = getOceafinTheme(isDark);
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={title + ': ' + (value === null ? 'Estimativa indisponível' : moeda(value)) + '. Abrir detalhes'}
      style={({ pressed }) => [s.linkedCard, {
        backgroundColor: t.surface, borderColor: t.border,
      }, pressed && s.pressed]}>
      <View style={s.linkedHeader}>
        <WorkspaceIcon name={icon} size={19} color={t.link} />
        <Text style={[s.linkedLabel, { color: t.muted }]}>{title}</Text>
      </View>
      <Text style={[s.linkedAmount, { color: t.text }]} numberOfLines={2}
        adjustsFontSizeToFit minimumFontScale={0.75}>
        {value === null ? 'Sem estimativa' : hidden ? 'R$ •••••' : moeda(value)}
      </Text>
      <Text style={[s.caption, { color: t.muted }]}>{hint}</Text>
      <Text style={[s.cardLink, { color: t.link }]}>Ver detalhes  ›</Text>
    </Pressable>
  );
}

export function OceanDashboard({
  resumo, lancamentos, planner, forecasts, mes, ano, limite, salvandoLimite,
  onSalvarLimite, onNavigate,
}: Props) {
  const s = useAccessibleStyles(styles);
  const { isDark } = useAccessibility();
  const [hideValues, setHideValues] = useState(false);
  const { width } = useWindowDimensions();
  const t = getOceafinTheme(isDark);
  const period = String(mes).padStart(2, '0') + '/' + ano;
  const small = width < 680;
  const categories = useMemo(() => categorySpending(lancamentos), [lancamentos]);
  const recent = useMemo(() => latestTransactions(lancamentos), [lancamentos]);
  const balances = useMemo(() => plannerBalances(planner), [planner]);
  const pending = forecasts.filter(item => !item.posted);
  const topExpense = lancamentos.filter(item => item.tipo === 'despesa')
    .reduce<Lancamento | null>((max, item) => !max || item.valor > max.valor ? item : max, null);
  const biggestCategory = categories[0];
  const totalExpenses = resumo?.totalDespesas ?? 0;

  return (
    <View style={s.container}>
      <View style={s.intro}>
        <View style={s.introCopy}>
          <Text style={[s.kicker, { color: t.link }]}>OCEAFIN  /  {period}</Text>
          <Text style={[s.heading, { color: t.text }]} accessibilityRole="header">
            Visão geral
          </Text>
          <Text style={[s.subtitle, { color: t.muted }]}>
            Suas finanças, mais simples. Tudo o que importa em um só lugar.
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Criar novo lançamento"
          onPress={() => onNavigate('lancamentos')}
          style={({ pressed }) => [s.primaryAction, pressed && s.pressed]}>
          <Text style={s.primaryActionText}>＋ Novo lançamento</Text>
        </Pressable>
      </View>

      <View style={s.heroSection}>
        <OceanHero balance={balances.accountTotal}
          monthResult={resumo?.saldo ?? null} period={period}
          hidden={hideValues} onToggle={() => setHideValues(v => !v)}
          onAccounts={() => onNavigate('contas')} />
        <View style={s.amountColumn}>
          <AmountCard title="Receitas" value={resumo?.totalReceitas ?? 0}
            hint="Entradas registradas no mês" tone="income" hidden={hideValues} />
          <AmountCard title="Despesas" value={resumo?.totalDespesas ?? 0}
            hint="Saídas registradas no mês" tone="expense" hidden={hideValues} />
        </View>
      </View>
      <OceanFlowChart items={lancamentos} period={period}
        hidden={hideValues} onDetails={() => onNavigate('graficos')} />

      <SectionHeading overline="POSIÇÃO FINANCEIRA" title="Contas e cartões"
        subtitle="Valores derivados dos lançamentos vinculados, não de uma conexão bancária." />
      <View style={s.linkedRow}>
        {balances.hasAccounts && (
          <LinkedAccountCard title="Saldo estimado nas contas" icon="contas"
            value={balances.accountTotal} hidden={hideValues}
            hint="Saldo inicial + movimentações vinculadas e transferências, menos faturas pagas."
            onPress={() => onNavigate('contas')} />
        )}
        {balances.hasCards && (
          <LinkedAccountCard title="Compras pendentes nos cartões" icon="contas"
            value={balances.cardPending} hidden={hideValues}
            hint="Compras registradas menos pagamentos informados. Não é a fatura do banco."
            onPress={() => onNavigate('contas')} />
        )}
        {!balances.hasAccounts && !balances.hasCards && (
          <Pressable accessibilityRole="button" onPress={() => onNavigate('contas')}
            style={({ pressed }) => [s.emptyLinked, {
              backgroundColor: t.surface, borderColor: t.border,
            }, pressed && s.pressed]}>
            <Text style={[s.emptyTitle, { color: t.text }]}>
              {planner ? 'Organize suas contas e cartões' : 'Resumo de contas indisponível'}
            </Text>
            <Text style={[s.helper, { color: t.muted }]}>
              {planner ? 'Cadastre uma conta ou cartão para acompanhar estimativas aqui.'
                : 'Os valores do planejamento não foram carregados nesta visualização.'}
            </Text>
            <Text style={[s.cardLink, { color: t.link }]}>Abrir contas e cartões  ›</Text>
          </Pressable>
        )}
      </View>

      <SectionHeading overline="ATALHOS" title="Seu próximo passo"
        subtitle="As ferramentas importantes estão sempre por perto." />
      <View style={s.shortcuts}>
        {SHORTCUTS.map(item => (
          <Pressable key={item.id} accessibilityRole="button"
            accessibilityLabel={'Abrir ' + item.titulo}
            onPress={() => onNavigate(item.id)}
            style={({ pressed }) => [s.shortcut, {
              backgroundColor: t.surface, borderColor: t.border,
            }, pressed && s.pressed]}>
            <View style={[s.shortcutIcon, { backgroundColor: t.selected }]}>
              <WorkspaceIcon name={item.id as WorkspaceIconName} size={21} color={t.link}/>
            </View>
            <Text numberOfLines={2} style={[s.shortcutTitle, { color: t.text }]}>
              {item.titulo}
            </Text>
            <Text numberOfLines={2} style={[s.caption, { color: t.muted }]}>
              {item.legenda}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionHeading overline="ORGANIZAÇÃO" title="Orçamento e recorrências"
        subtitle="O que já aconteceu fica separado do que ainda está previsto." />
      <View style={s.planningRow}>
        <View style={s.planningColumn}>
          <MonthlyOverview key={period} totalDespesas={totalExpenses}
            limite={limite} salvando={salvandoLimite} onSalvarLimite={onSalvarLimite} />
        </View>
        <View style={[s.forecastCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[s.boxTitle, { color: t.text }]}>Recorrências do mês</Text>
          <Text style={[s.helper, { color: t.muted }]}>
            Previstas não entram no resultado até serem registradas.
          </Text>
          {!forecasts.length ? (
            <Text style={[s.emptyHint, { color: t.muted }]}>
              Nenhuma recorrência programada para este mês.
            </Text>
          ) : (
            <>
              <View style={[s.countPill, { backgroundColor: t.selected }]}>
                <Text style={[s.countText, { color: t.text }]}>
                  {pending.length} prevista{pending.length !== 1 ? 's' : ''} · {forecasts.length - pending.length} registrada{forecasts.length - pending.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {forecasts.slice(0, 3).map(({ rule, posted }) => (
                <View key={rule.id} style={[s.forecastItem, { borderColor: t.border }]}>
                  <View style={s.forecastInfo}>
                    <Text numberOfLines={2} style={[s.rowTitle, { color: t.text }]}>
                      {rule.description}
                    </Text>
                    <Text style={[s.caption, { color: t.muted }]}>
                      Dia {rule.day_of_month} · {moeda(Number(rule.amount))}
                    </Text>
                  </View>
                  <Text style={[s.statusLabel, {
                    color: posted ? isDark ? '#88E8CE' : '#116F5A' : t.link,
                  }]}>{posted ? 'Registrada' : 'Prevista'}</Text>
                </View>
              ))}
              {forecasts.length > 3 &&
                <Text style={[s.caption, { color: t.muted }]}>
                  E mais {forecasts.length - 3} recorrência{forecasts.length - 3 > 1 ? 's' : ''}.
                </Text>}
            </>
          )}
          <Pressable accessibilityRole="button" onPress={() => onNavigate('automacao')}
            style={s.inlineAction}>
            <Text style={[s.cardLink, { color: t.link }]}>Abrir calendário financeiro  ›</Text>
          </Pressable>
        </View>
      </View>

      <PaymentReminders month={mes} year={ano} />

      <SectionHeading overline="COMPORTAMENTO" title="Para onde foi o dinheiro?"
        subtitle="Distribuição das despesas lançadas no mês selecionado." />
      <View style={s.insightRow}>
        <View style={[s.breakdownCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[s.boxTitle, { color: t.text }]}>Gastos por categoria</Text>
          {!categories.length ? (
            <Text style={[s.emptyHint, { color: t.muted }]}>
              Quando você registrar despesas, verá a distribuição por categoria aqui.
            </Text>
          ) : categories.slice(0, 5).map((item, index) => (
            <View key={item.categoria} style={s.barItem}>
              <View style={s.barTop}>
                <Text style={[s.rowTitle, { color: t.text }]} numberOfLines={2}>
                  {item.categoria}
                </Text>
                <Text style={[s.barAmount, { color: t.text }]}>{hideValues ? 'R$ •••••' : moeda(item.valor)}</Text>
              </View>
              <View accessible accessibilityLabel={item.categoria + ', ' +
                moeda(item.valor) + ', ' + Math.round(item.percentual) + '% das despesas'}
                style={[s.barTrack, { backgroundColor: t.selected }]}>
                <View style={[s.barFill, { width: Math.min(100, Math.max(0, item.percentual)) + '%',
                  backgroundColor: index === 0 ? t.primary : t.accent }]} />
              </View>
            </View>
          ))}
          {categories.length > 5 && <Text style={[s.caption, { color: t.muted }]}>
            Exibindo as cinco categorias com maior gasto.
          </Text>}
          <View style={[s.breakdownFooter, { borderColor: t.border }]}>
            <Text style={[s.caption, { color: t.muted }]}>Maior despesa</Text>
            <Text style={[s.rowTitle, { color: t.text }]}>
              {topExpense ? topExpense.descricao + ' · ' + (hideValues ? 'R$ •••••' : moeda(topExpense.valor)) : 'Nenhuma'}
            </Text>
            <Text style={[s.caption, { color: t.muted }]}>Categoria principal</Text>
            <Text style={[s.rowTitle, { color: t.text }]}>
              {biggestCategory ? biggestCategory.categoria : 'Nenhuma'}
            </Text>
          </View>
          <Pressable onPress={() => onNavigate('graficos')} accessibilityRole="button"
            style={s.inlineAction}>
            <Text style={[s.cardLink, { color: t.link }]}>Ver todos os gráficos  ›</Text>
          </Pressable>
        </View>
        <View style={[s.recentCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={s.recentHeader}>
            <Text style={[s.boxTitle, { color: t.text }]}>Últimos lançamentos</Text>
            <Text style={[s.caption, { color: t.muted }]}>{period}</Text>
          </View>
          {!recent.length ? (
            <Text style={[s.emptyHint, { color: t.muted }]}>
              Nenhum lançamento neste mês. Adicione sua primeira receita ou despesa.
            </Text>
          ) : recent.map(tx => (
            <View key={tx.id} style={[s.transactionRow, { borderColor: t.border }]}>
              <View style={[s.transactionDot, {
                backgroundColor: tx.tipo === 'receita' ? '#42B6A0' : '#D99C8F',
              }]} />
              <View style={s.transactionInfo}>
                <Text numberOfLines={2} style={[s.rowTitle, { color: t.text }]}>
                  {tx.descricao}
                </Text>
                <Text style={[s.caption, { color: t.muted }]}>
                  {tx.categoria} · {tx.data.slice(8, 10)}/{tx.data.slice(5, 7)}
                </Text>
              </View>
              <Text numberOfLines={2} style={[s.transactionAmount, {
                color: tx.tipo === 'receita' ? isDark ? '#88E8CE' : '#116F5A'
                  : isDark ? '#FFC1B7' : '#AB493C',
              }]}>
                {tx.tipo === 'receita' ? '+' : '−'} {hideValues ? 'R$ •••••' : moeda(tx.valor)}
              </Text>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => onNavigate('lancamentos')}
            style={s.inlineAction}>
            <Text style={[s.cardLink, { color: t.link }]}>Ver todos os lançamentos  ›</Text>
          </Pressable>
        </View>
      </View>
      {small && <Text style={[s.bottomNote, { color: t.muted }]}>
        Informações referentes ao período selecionado: {period}.
      </Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18, paddingBottom: 12 },
  intro: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    justifyContent: 'space-between', gap: 16 },
  introCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0, gap: 6 },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  heading: { fontSize: 27, lineHeight: 34, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 13, lineHeight: 20 },
  helper: { fontSize: 12, lineHeight: 19 },
  primaryAction: { alignSelf: 'flex-start', backgroundColor: '#0B7189',
    minHeight: 46, borderRadius: 14, paddingHorizontal: 16,
    justifyContent: 'center', alignItems: 'center' },
  primaryActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.82 },
  heroSection: { gap: 13 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  hero: { flex: 1, flexGrow: 1, flexBasis: 330, minWidth: 0, borderRadius: 24,
    padding: 24, gap: 9, overflow: 'hidden', backgroundColor: '#0C293D', minHeight: 242 },
  heroArt: { position: 'absolute', right: -14, top: -15, opacity: 0.48 },
  heroKicker: { fontSize: 10, color: '#67DCCE', fontWeight: '900', letterSpacing: 1.6 },
  heroLabel: { color: '#C4E3EA', fontWeight: '700', fontSize: 13 },
  heroNumber: { color: '#FFFFFF', fontSize: 32, fontWeight: '900',
    letterSpacing: -0.7, flexShrink: 1 },
  heroFoot: { fontSize: 11, lineHeight: 17, color: '#D0E6EF' },
  heroLine: { width: 44, height: 3, backgroundColor: '#67DCCE', borderRadius: 4, marginTop: 9 },
  heroMicro: { fontSize: 12, fontWeight: '700', color: '#67DCCE' },
  amountColumn: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  amountCard: { flexGrow: 1, flexBasis: 190, minWidth: 0, borderWidth: 1,
    borderRadius: 20, padding: 17, gap: 10, overflow: 'hidden' },
  amountAccent: { height: 4, width: 34, borderRadius: 4 },
  amountLabel: { fontSize: 12, fontWeight: '700' },
  amountValue: { fontSize: 23, fontWeight: '900', flexShrink: 1 },
  caption: { fontSize: 11, lineHeight: 17 },
  sectionHeading: { gap: 5, marginTop: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  linkedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  linkedCard: { flexGrow: 1, flexBasis: 260, minWidth: 0,
    borderWidth: 1, borderRadius: 20, padding: 17, gap: 9 },
  linkedHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  linkedLabel: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '700' },
  linkedAmount: { fontSize: 22, fontWeight: '900', flexShrink: 1 },
  cardLink: { fontSize: 12, fontWeight: '800' },
  emptyLinked: { flexGrow: 1, borderWidth: 1, borderRadius: 20,
    padding: 18, gap: 9, minHeight: 105 },
  emptyTitle: { fontWeight: '800', fontSize: 15 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shortcut: { flexGrow: 1, flexBasis: 154, minWidth: 0, gap: 7,
    borderWidth: 1, borderRadius: 18, padding: 14, minHeight: 130 },
  shortcutIcon: { width: 39, height: 39, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center' },
  shortcutTitle: { fontSize: 13, fontWeight: '800' },
  planningRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  planningColumn: { flexGrow: 1, flexBasis: 330, minWidth: 0 },
  forecastCard: { flexGrow: 1, flexBasis: 300, minWidth: 0,
    borderWidth: 1, borderRadius: 22, padding: 20, gap: 12 },
  boxTitle: { fontWeight: '900', fontSize: 17 },
  countPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999 },
  countText: { fontSize: 11, fontWeight: '800' },
  forecastItem: { flexDirection: 'row', alignItems: 'center', gap: 9,
    borderTopWidth: 1, paddingTop: 11 },
  forecastInfo: { flex: 1, minWidth: 0, gap: 5 },
  rowTitle: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  statusLabel: { fontSize: 11, fontWeight: '800' },
  emptyHint: { fontSize: 12, lineHeight: 19, paddingVertical: 12 },
  inlineAction: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 43,
    paddingHorizontal: 4 },
  insightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  breakdownCard: { flexGrow: 1, flexBasis: 340, minWidth: 0,
    borderWidth: 1, borderRadius: 22, padding: 19, gap: 14 },
  barItem: { gap: 7 },
  barTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  barAmount: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  barTrack: { height: 9, borderRadius: 9, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 9 },
  breakdownFooter: { gap: 6, borderTopWidth: 1, paddingTop: 12 },
  recentCard: { flexGrow: 1, flexBasis: 320, minWidth: 0,
    borderWidth: 1, borderRadius: 22, padding: 19, gap: 12 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 9, alignItems: 'center' },
  transactionRow: { flexDirection: 'row', gap: 9, alignItems: 'center',
    borderTopWidth: 1, paddingTop: 11 },
  transactionDot: { width: 9, height: 9, borderRadius: 99 },
  transactionInfo: { flex: 1, minWidth: 0, gap: 4 },
  transactionAmount: { fontSize: 12, fontWeight: '900',
    textAlign: 'right', maxWidth: 132, flexShrink: 1 },
  bottomNote: { fontSize: 11, lineHeight: 18 },
});
