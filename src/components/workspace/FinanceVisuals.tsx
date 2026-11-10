import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import type { Lancamento, ResumoFinanceiro } from '../../types/finance';
import { ExpensePieChart } from '../finance/ExpensePieChart';

export const moeda = (valor: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
}).format(Number.isFinite(valor) ? valor : 0);

export type MesAnalise = {
  mes: number; ano: number; resumo: ResumoFinanceiro;
};

export function Metric({ titulo, valor, detalhe, positivo }: {
  titulo: string; valor: string; detalhe?: string; positivo?: boolean;
}) {
  const s = useAccessibleStyles(styles);
  return (
    <View style={s.metric}>
      <Text style={s.subtle}>{titulo}</Text>
      <Text style={s.metricNumber}>{valor}</Text>
      {detalhe ? <Text style={positivo ? s.positive : s.subtle}>{detalhe}</Text> : null}
    </View>
  );
}

function BarComparison({ meses }: { meses: MesAnalise[] }) {
  const s = useAccessibleStyles(styles);
  if (!meses.length) return <Text style={s.subtle}>Sem dados para gerar a comparação.</Text>;
  const max = Math.max(1, ...meses.flatMap(item => [item.resumo.totalReceitas, item.resumo.totalDespesas]));
  return (
    <View style={s.card}>
      <Text style={s.title}>Receitas × despesas</Text>
      <View style={s.barRow}>
        {meses.map(item => (
          <View key={item.ano + '-' + item.mes} style={s.barSlot}>
            <View style={s.barGroup}>
              <View style={[s.barIncome, { height: Math.max(2, 132 * item.resumo.totalReceitas / max) }]} />
              <View style={[s.barExpense, { height: Math.max(2, 132 * item.resumo.totalDespesas / max) }]} />
            </View>
            <Text style={s.barLabel}>{String(item.mes).padStart(2, '0')}/{String(item.ano).slice(2)}</Text>
          </View>
        ))}
      </View>
      <Text style={s.subtle}>■ Turquesa: receitas   ■ Azul oceânico: despesas. Valores mensais.</Text>
      {meses.map(item => (
        <Text key={'line-' + item.ano + '-' + item.mes} style={s.subtle}>
          {String(item.mes).padStart(2, '0')}/{item.ano}: {moeda(item.resumo.totalReceitas)} recebidos · {moeda(item.resumo.totalDespesas)} gastos
        </Text>
      ))}
    </View>
  );
}

export function TrendLine({ values, labels, title }: {
  values: number[]; labels: string[]; title: string;
}) {
  const s = useAccessibleStyles(styles);
  const [availableWidth, setAvailableWidth] = useState(320);
  const chartWidth = Math.max(120, Math.min(620, availableWidth));
  const h = 180, pad = 16, safe = values.length ? values : [0];
  const low = Math.min(0, ...safe), high = Math.max(1, ...safe);
  const extent = Math.max(1, high - low);
  const points = safe.map((v, i) => ({
    x: pad + (chartWidth - pad * 2) * i / Math.max(1, safe.length - 1),
    y: h - pad - ((v - low) / extent) * (h - pad * 2),
  }));
  const d = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' ');
  return (
    <View style={s.card} onLayout={e => {
      const measured = e.nativeEvent.layout.width - 34;
      if (Math.abs(measured - availableWidth) > 2) setAvailableWidth(measured);
    }}>
      <Text style={s.title}>{title}</Text>
      <View accessibilityLabel={title + ': ' + safe.map((v, i) => (labels[i] || i + 1) + ' ' + moeda(v)).join(', ')}>
        <Svg width={chartWidth} height={h} viewBox={'0 0 ' + chartWidth + ' ' + h}>
          {[0, 0.5, 1].map(v => <Line key={v} x1={pad} x2={chartWidth - pad} y1={pad + v * (h - pad * 2)} y2={pad + v * (h - pad * 2)} stroke="#DDD6E6" strokeWidth={1} />)}
          <Path d={d} fill="none" stroke="#00BDAE" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={4} fill="#00BDAE" />)}
        </Svg>
      </View>
      <Text style={s.subtle}>{safe.length ? 'Início: ' + moeda(safe[0]) + ' · Final: ' + moeda(safe[safe.length - 1]) : 'Sem dados'}</Text>
      <View style={s.labelRow}>
        <Text style={s.subtle}>{labels[0] || 'Início'}</Text>
        <Text style={s.subtle}>{labels[labels.length - 1] || 'Fim'}</Text>
      </View>
    </View>
  );
}

export function ChartsArea({ meses, lancamentos }: { meses: MesAnalise[]; lancamentos: Lancamento[] }) {
  const s = useAccessibleStyles(styles);
  const totais = useMemo(() => {
    const receitas = meses.reduce((v, item) => v + item.resumo.totalReceitas, 0);
    const despesas = meses.reduce((v, item) => v + item.resumo.totalDespesas, 0);
    const melhor = meses.reduce<MesAnalise | null>((r, item) =>
      !r || item.resumo.saldo > r.resumo.saldo ? item : r, null);
    return { receitas, despesas, melhor };
  }, [meses]);
  const saldoAcumulado = useMemo(() => {
    let saldo = 0;
    return meses.map(item => (saldo += item.resumo.saldo));
  }, [meses]);
  return (
    <View style={s.section}>
      <Text style={s.heading}>Gráficos e tendências</Text>
      <Text style={s.subtle}>Comparação dos últimos meses, com dados reais da sua conta. Saldo acumulado representa a soma dos resultados dos meses exibidos, não o saldo bancário.</Text>
      <View style={s.row}>
        <Metric titulo="Receitas no período" valor={moeda(totais.receitas)} />
        <Metric titulo="Despesas no período" valor={moeda(totais.despesas)} />
        <Metric titulo="Resultado no período" valor={moeda(totais.receitas - totais.despesas)} positivo={totais.receitas >= totais.despesas} />
        <Metric titulo="Melhor mês" valor={totais.melhor ? String(totais.melhor.mes).padStart(2, '0') + '/' + totais.melhor.ano : '—'} detalhe={totais.melhor ? moeda(totais.melhor.resumo.saldo) : undefined} />
      </View>
      <TrendLine title="Resultado acumulado do período" values={saldoAcumulado} labels={meses.map(m => String(m.mes).padStart(2, '0') + '/' + m.ano)} />
      <BarComparison meses={meses} />
      <ExpensePieChart lancamentos={lancamentos} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { flexGrow: 1, flexBasis: 170, minWidth: 145, backgroundColor: '#FFFFFF', borderColor: '#ECE8F1', borderWidth: 1, borderRadius: 18, padding: 17, gap: 7 },
  metricNumber: { fontSize: 20, fontWeight: '800', color: '#111827', flexShrink: 1 },
  title: { color: '#111827', fontWeight: '800', fontSize: 18 },
  heading: { fontSize: 25, fontWeight: '900', color: '#111827' },
  subtle: { color: '#6B7280', fontSize: 12, lineHeight: 19 },
  positive: { color: '#15803D', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderColor: '#ECE8F1', borderWidth: 1, borderRadius: 20, padding: 17, gap: 12, alignItems: 'flex-start' },
  barRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', alignItems: 'flex-end', gap: 4, minHeight: 157 },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  barGroup: { height: 136, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barIncome: { backgroundColor: '#00BDAE', borderTopLeftRadius: 4, borderTopRightRadius: 4, width: 10 },
  barExpense: { backgroundColor: '#0077C8', borderTopLeftRadius: 4, borderTopRightRadius: 4, width: 10 },
  barLabel: { fontSize: 10, color: '#6B7280' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
});
