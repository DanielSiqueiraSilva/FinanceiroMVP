import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Lancamento } from '../../types/finance';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

type Props = { lancamentos: Lancamento[] };

const CORES = ['#7C3AED', '#A78BFA', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#6B7280'];

function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export function ExpensePieChart({ lancamentos }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const despesas = lancamentos.filter((item) => item.tipo === 'despesa');
  const porCategoria = despesas.reduce<Record<string, number>>((acc, item) => {
    acc[item.categoria] = (acc[item.categoria] ?? 0) + item.valor;
    return acc;
  }, {});

  const dados = Object.entries(porCategoria)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);
  const total = dados.reduce((soma, item) => soma + item.valor, 0);

  if (total <= 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.titulo}>Gastos por categoria</Text>
        <Text style={styles.vazio}>Cadastre despesas neste mês para visualizar o gráfico.</Text>
      </View>
    );
  }

  const raio = 48;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Gastos por categoria</Text>
      <View style={styles.conteudo}>
        <View style={styles.graficoWrap}>
          <Svg width={150} height={150} viewBox="0 0 120 120">
            <Circle cx="60" cy="60" r={raio} stroke={colors.chartTrack} strokeWidth="18" fill="none" />
            {dados.map((item, index) => {
              const fracao = item.valor / total;
              const dash = fracao * circunferencia;
              const offset = -acumulado * circunferencia;
              acumulado += fracao;
              return (
                <Circle
                  key={item.categoria}
                  cx="60"
                  cy="60"
                  r={raio}
                  stroke={CORES[index % CORES.length]}
                  strokeWidth="18"
                  fill="none"
                  strokeDasharray={`${dash} ${circunferencia - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  transform="rotate(-90 60 60)"
                />
              );
            })}
          </Svg>
          <View style={styles.centroGrafico} pointerEvents="none">
            <Text style={styles.centroRotulo}>Total</Text>
            <Text style={styles.centroValor}>{moeda(total)}</Text>
          </View>
        </View>

        <View style={styles.legenda}>
          {dados.map((item, index) => (
            <View key={item.categoria} style={styles.legendaLinha}>
              <View style={[styles.bolinha, { backgroundColor: CORES[index % CORES.length] }]} />
              <View style={styles.legendaTextoWrap}>
                <Text style={styles.categoria} numberOfLines={1}>{item.categoria}</Text>
                <Text style={styles.valor}>{moeda(item.valor)} · {Math.round((item.valor / total) * 100)}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 16 },
    titulo: { fontSize: 19, fontWeight: '800', color: colors.textPrimary },
    conteudo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 },
    graficoWrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
    centroGrafico: { position: 'absolute', alignItems: 'center', width: 100 },
    centroRotulo: { fontSize: 11, color: colors.textSecondary },
    centroValor: { fontSize: 13, color: colors.textPrimary, fontWeight: '800', textAlign: 'center' },
    legenda: { flex: 1, minWidth: 190, gap: 10 },
    legendaLinha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bolinha: { width: 10, height: 10, borderRadius: 99 },
    legendaTextoWrap: { flex: 1 },
    categoria: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    valor: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    vazio: { color: colors.textSecondary },
  });
}
