import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import type { Lancamento } from '../../types/finance';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { getOceafinTheme } from '../../design/tokens';
import { moeda } from '../workspace/FinanceVisuals';

export function weeklyFlow(items: readonly Lancamento[]) {
  const weeks = Array.from({ length: 5 }, (_, index) => ({
    label: 'Sem. ' + (index + 1),
    income: 0, expense: 0,
  }));
  for (const item of items) {
    const day = Number(item.data.slice(8, 10));
    if (!Number.isFinite(day) || day < 1 || day > 31) continue;
    const n = Math.min(4, Math.floor((day - 1) / 7));
    if (item.tipo === 'receita') weeks[n].income += Number(item.valor);
    if (item.tipo === 'despesa') weeks[n].expense += Number(item.valor);
  }
  return weeks;
}

export function OceanFlowChart({ items, period, onDetails, hidden }: {
  items: readonly Lancamento[]; period: string;
  onDetails: () => void; hidden: boolean;
}) {
  const { isDark } = useAccessibility();
  const t = getOceafinTheme(isDark);
  const weeks = useMemo(() => weeklyFlow(items), [items]);
  const max = Math.max(1, ...weeks.flatMap(w => [w.income, w.expense]));
  const p = (field: 'income' | 'expense') => weeks.map((week, i) => {
    const x = 26 + i * 128;
    const y = 147 - week[field] / max * 112;
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  const hasData = items.length > 0;
  return <View style={[styles.card, {
    backgroundColor: t.surface, borderColor: t.border,
  }]}>
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={[styles.overline, { color: t.link }]}>ANÁLISES</Text>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
          Evolução financeira
        </Text>
        <Text style={[styles.subtitle, { color: t.muted }]}>
          Receitas e despesas por semana · {period}
        </Text>
      </View>
      <Pressable onPress={onDetails} accessibilityRole="button" style={styles.link}>
        <Text style={[styles.linkText, { color: t.link }]}>Ver detalhes  ›</Text>
      </Pressable>
    </View>
    <View style={styles.legend}>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#04BBA8' }]}/>
        <Text style={[styles.legendText, { color: t.muted }]}>Receitas</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#0077C8' }]}/>
        <Text style={[styles.legendText, { color: t.muted }]}>Despesas</Text></View>
    </View>
    {hasData ? <View accessible accessibilityLabel={hidden
      ? 'Gráfico de receitas e despesas do período, com valores ocultos.'
      : 'Gráfico semanal de ' + period + '. ' +
      weeks.map(w => w.label + ' receitas ' + moeda(w.income) +
      ' despesas ' + moeda(w.expense)).join('. ')
    }>
      <Svg width="100%" height={180} viewBox="0 0 566 176">
        <Defs>
          <LinearGradient id="flow-blue" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#009EDC"/><Stop offset="1" stopColor="#0077C8"/>
          </LinearGradient>
        </Defs>
        {[35, 91, 147].map((y,i) => <Line key={i} x1="18" x2="554" y1={y} y2={y}
          stroke={t.border} strokeWidth="1" strokeDasharray="3,6" />)}
        <Path d={p('income')} stroke="#04BBA8" strokeWidth="4" strokeLinecap="round"
          strokeLinejoin="round" fill="none" />
        <Path d={p('expense')} stroke="url(#flow-blue)" strokeWidth="4"
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {weeks.map((w,i) => <Circle key={'i'+i} cx={26 + i*128}
          cy={147-w.income/max*112} r={4.5} fill="#04BBA8" />)}
        {weeks.map((w,i) => <Circle key={'e'+i} cx={26 + i*128}
          cy={147-w.expense/max*112} r={4.5} fill="#0077C8" />)}
      </Svg>
      <View style={styles.xLabels}>
        {weeks.map(w => <Text key={w.label} style={[styles.tick, { color: t.muted }]}>{w.label}</Text>)}
      </View>
    </View> : <Text style={[styles.empty, { color: t.muted }]}>
      Os gráficos aparecerão quando houver lançamentos no período selecionado.
    </Text>}
    <Text style={[styles.caption, { color: t.muted }]}>
      Os valores são lançamentos registrados, não projeções. {hidden
        ? 'Valores numéricos ocultos no painel.' : 'Visualização por semanas do mês.'}
    </Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 21, padding: 20, borderWidth: 1, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between',
    flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  headerCopy: { flex: 1, gap: 5, minWidth: 180 },
  overline: { fontSize: 10, letterSpacing: 1.3, fontWeight: '800' },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3,
    fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined },
  subtitle: { fontSize: 12 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 12, fontWeight: '800' },
  legend: { flexDirection: 'row', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '700' },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 8 },
  tick: { fontSize: 11 },
  empty: { fontSize: 13, paddingVertical: 33 },
  caption: { fontSize: 11, lineHeight: 18 },
});
