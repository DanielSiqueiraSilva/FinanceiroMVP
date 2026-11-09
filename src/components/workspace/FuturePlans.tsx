import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { Metric, moeda, TrendLine } from './FinanceVisuals';

export type Simulacao = {
  patrimonioFinal: number; patrimonioAlvo: number; aporteNecessario: number;
  atingimento: number; tempoAnos: number; pontos: number[]; idades: string[];
};

export function simularPlano(params: {
  idadeAtual: number; idadeAlvo: number; renda: number;
  patrimonio: number; aporte: number; rentabilidade: number;
  inflacao: number; retiradaAnual: number;
}): Simulacao {
  const { idadeAtual, idadeAlvo, renda, patrimonio, aporte, rentabilidade, inflacao, retiradaAnual } = params;
  const meses = Math.max(0, Math.round((idadeAlvo - idadeAtual) * 12));
  // Valores reais (poder de compra de hoje), aportes constantes em termos reais.
  const taxaReal = Math.pow((1 + rentabilidade / 100) / (1 + inflacao / 100), 1 / 12) - 1;
  const fator = Math.pow(1 + taxaReal, meses);
  const fatorAportes = Math.abs(taxaReal) < 1e-10 ? meses : (fator - 1) / taxaReal;
  const patrimonioFinal = Math.max(0, patrimonio * fator + aporte * fatorAportes);
  const patrimonioAlvo = renda * 12 / (retiradaAnual / 100);
  const aporteNecessario = Math.max(0, (patrimonioAlvo - patrimonio * fator) / Math.max(fatorAportes, 1));
  const pontos: number[] = [];
  const idades: string[] = [];
  for (let y = 0; y <= Math.max(0, idadeAlvo - idadeAtual); y++) {
    const n = y * 12;
    const f = Math.pow(1 + taxaReal, n);
    const aportes = Math.abs(taxaReal) < 1e-10 ? n : (f - 1) / taxaReal;
    pontos.push(Math.max(0, patrimonio * f + aporte * aportes));
    idades.push(String(idadeAtual + y) + ' anos');
  }
  return {
    patrimonioFinal, patrimonioAlvo, aporteNecessario,
    atingimento: patrimonioAlvo > 0 ? Math.min(100, patrimonioFinal / patrimonioAlvo * 100) : 0,
    tempoAnos: idadeAlvo - idadeAtual, pontos, idades,
  };
}
const numberFrom = (value: string) => Number(value.trim().replace(/\s/g, '').replace(',', '.'));

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const s = useAccessibleStyles(base);
  const { isDark } = useAccessibility();
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} style={s.input}
        keyboardType="decimal-pad" accessibilityLabel={label}
        placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'}
      />
      {hint ? <Text style={s.muted}>{hint}</Text> : null}
    </View>
  );
}

export function FuturePlans() {
  const s = useAccessibleStyles(base);
  const { width } = useWindowDimensions();
  const [idadeAtual, setIdadeAtual] = useState('25');
  const [idadeAlvo, setIdadeAlvo] = useState('60');
  const [renda, setRenda] = useState('5000');
  const [patrimonio, setPatrimonio] = useState('0');
  const [aporte, setAporte] = useState('500');
  const [rentabilidade, setRentabilidade] = useState('8');
  const [inflacao, setInflacao] = useState('4');
  const [retirada, setRetirada] = useState('4');
  const params = useMemo(() => ({
    idadeAtual: numberFrom(idadeAtual), idadeAlvo: numberFrom(idadeAlvo),
    renda: numberFrom(renda), patrimonio: numberFrom(patrimonio),
    aporte: numberFrom(aporte), rentabilidade: numberFrom(rentabilidade),
    inflacao: numberFrom(inflacao), retiradaAnual: numberFrom(retirada),
  }), [idadeAtual, idadeAlvo, renda, patrimonio, aporte, rentabilidade, inflacao, retirada]);
  const valido = Object.values(params).every(Number.isFinite) &&
    params.idadeAtual >= 0 && params.idadeAtual <= 100 &&
    Number.isInteger(params.idadeAtual) && Number.isInteger(params.idadeAlvo) &&
    params.idadeAlvo > params.idadeAtual && params.idadeAlvo <= 110 &&
    params.renda > 0 && params.renda <= 1e9 &&
    params.patrimonio >= 0 && params.patrimonio <= 1e12 &&
    params.aporte >= 0 && params.aporte <= 1e8 &&
    params.rentabilidade > -95 && params.rentabilidade <= 50 &&
    params.inflacao >= 0 && params.inflacao <= 30 &&
    params.retiradaAnual > 0 && params.retiradaAnual <= 15;
  const simulacao = valido ? simularPlano(params) : null;
  const cols = width >= 1000 ? 3 : width >= 600 ? 2 : 1;
  return (
    <View style={s.section}>
      <Text style={s.heading}>Planos Futuros</Text>
      <Text style={s.muted}>Simule a renda desejada na aposentadoria com valores em poder de compra de hoje. Os cálculos são educativos, não garantias de investimento.</Text>
      <View style={s.card}>
        <Text style={s.title}>Simulador de aposentadoria e renda</Text>
        <View style={s.grid}>
          {[
            ['Idade atual', idadeAtual, setIdadeAtual, 'Anos completos'],
            ['Idade para se aposentar', idadeAlvo, setIdadeAlvo, 'Idade de referência'],
            ['Renda mensal desejada (R$)', renda, setRenda, 'Em valores de hoje'],
            ['Patrimônio atual (R$)', patrimonio, setPatrimonio, 'Disponível para este objetivo'],
            ['Aporte mensal (R$)', aporte, setAporte, 'Em valores de hoje'],
            ['Retorno anual nominal (%)', rentabilidade, setRentabilidade, 'Hipótese, não promessa'],
            ['Inflação anual estimada (%)', inflacao, setInflacao, 'Para corrigir poder de compra'],
            ['Taxa anual de retirada (%)', retirada, setRetirada, 'Hipótese de planejamento; não é taxa garantida'],
          ].map(([label, value, fn, hint]) => (
            <View key={label as string} style={{ width: cols === 3 ? '31.5%' : cols === 2 ? '48%' : '100%' }}>
              <Field label={label as string} value={value as string} onChange={fn as (v: string) => void} hint={hint as string} />
            </View>
          ))}
        </View>
      </View>
      {!simulacao ? <Text style={s.error}>Revise os valores: a idade final deve ser maior que a atual e as taxas e valores precisam estar nos limites informados.</Text> : (
        <>
          <View style={s.grid}>
            <Metric titulo="Patrimônio projetado" valor={moeda(simulacao.patrimonioFinal)} detalhe="Valor real na idade escolhida" />
            <Metric titulo="Patrimônio de referência" valor={moeda(simulacao.patrimonioAlvo)} detalhe="Calculado pela hipótese de retirada anual" />
            <Metric titulo="Aporte mensal estimado para a meta" valor={moeda(simulacao.aporteNecessario)} detalhe="Com as hipóteses escolhidas" />
          </View>
          <View style={s.card}>
            <Text style={s.title}>Progresso projetado: {simulacao.atingimento.toFixed(1).replace('.', ',')}%</Text>
            <View style={s.track}><View style={[s.trackFill, { width: (simulacao.atingimento + '%') as `${number}%` }]} /></View>
            <Text style={s.muted}>Período: {simulacao.tempoAnos} anos. Aportes considerados ao fim de cada mês. O progresso é uma comparação matemática, não uma probabilidade de sucesso.</Text>
          </View>
          <TrendLine title="Evolução prevista do patrimônio" values={simulacao.pontos} labels={simulacao.idades} />
          <View style={s.card}>
            <Text style={s.title}>Compare cenários</Text>
            {[-2, 0, 2].map(delta => {
              const cenário = simularPlano({ ...params, rentabilidade: Math.max(-94, params.rentabilidade + delta) });
              return <Text key={delta} style={s.scenario}>
                {delta === 0 ? 'Base' : delta < 0 ? 'Cauteloso' : 'Otimista'} ({(params.rentabilidade + delta).toFixed(1).replace('.', ',')}% ao ano): {moeda(cenário.patrimonioFinal)}
              </Text>;
            })}
            <Text style={s.muted}>Os cenários variam apenas a rentabilidade. Impostos, taxas, mudanças de aportes e oscilações reais de mercado não são modelados. A regra de retirada é apenas uma hipótese simplificada.</Text>
          </View>
        </>
      )}
    </View>
  );
}

const base = StyleSheet.create({
  section: { gap: 16 },
  heading: { fontSize: 25, fontWeight: '900', color: '#111827' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  muted: { color: '#6B7280', fontSize: 12, lineHeight: 19 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#ECE8F1', borderWidth: 1, borderRadius: 20, padding: 18, gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { gap: 6, minWidth: 0 },
  label: { fontSize: 13, color: '#374151', fontWeight: '700' },
  input: { backgroundColor: '#FCFBFD', borderColor: '#DDD6E6', borderWidth: 1, borderRadius: 12, color: '#111827', fontSize: 16, paddingHorizontal: 13, minHeight: 48 },
  track: { width: '100%', height: 12, borderRadius: 12, backgroundColor: '#EDE9FE', overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: '#7C3AED', borderRadius: 12 },
  scenario: { fontSize: 14, fontWeight: '700', color: '#374151', lineHeight: 22 },
  error: { fontSize: 13, color: '#B91C1C' },
});
