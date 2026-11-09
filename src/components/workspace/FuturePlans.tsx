import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [idadeAtual, setIdadeAtual] = useState('25');
  const [idadeAlvo, setIdadeAlvo] = useState('60');
  const [renda, setRenda] = useState('5000');
  const [patrimonio, setPatrimonio] = useState('0');
  const [aporte, setAporte] = useState('500');
  const [rentabilidade, setRentabilidade] = useState('8');
  const [inflacao, setInflacao] = useState('4');
  const [retirada, setRetirada] = useState('4');
  const [avancado, setAvancado] = useState(false);
  const [cenarios, setCenarios] = useState(false);
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

  return <View style={s.section}>
    <Text style={s.heading}>Planeje seu futuro</Text>
    <Text style={s.muted}>Descubra quanto você poderia juntar para ter uma renda mensal no futuro. Preencha as perguntas abaixo e veja sua simulação.</Text>

    <View style={s.card}>
      <View style={s.stepRow}><Text style={s.step}>1</Text><Text style={s.title}>Qual é seu objetivo?</Text></View>
      <Text style={s.muted}>Imagine quanto gostaria de receber por mês ao se aposentar.</Text>
      <Field label="Renda mensal desejada (R$)" value={renda} onChange={setRenda} hint="Exemplo: 5000 significa receber R$ 5.000 por mês, em dinheiro de hoje." />
      <View style={s.fieldRow}>
        <View style={s.half}><Field label="Sua idade hoje" value={idadeAtual} onChange={setIdadeAtual} hint="Idade atual, em anos" /></View>
        <View style={s.half}><Field label="Idade para atingir a meta" value={idadeAlvo} onChange={setIdadeAlvo} hint="Exemplo: 60 anos" /></View>
      </View>
    </View>

    <View style={s.card}>
      <View style={s.stepRow}><Text style={s.step}>2</Text><Text style={s.title}>Quanto você pode guardar?</Text></View>
      <Text style={s.muted}>Não precisa investir de verdade para testar. Você pode mudar os números livremente.</Text>
      <View style={s.fieldRow}>
        <View style={s.half}><Field label="Quanto guardaria por mês? (R$)" value={aporte} onChange={setAporte} hint="Um valor mensal que você queira simular." /></View>
        <View style={s.half}><Field label="Quanto já tem guardado? (R$)" value={patrimonio} onChange={setPatrimonio} hint="Se não tiver, deixe 0." /></View>
      </View>
      <Pressable style={s.secondary} accessibilityRole="button" accessibilityState={{ expanded: avancado }} onPress={() => setAvancado(x => !x)}>
        <Text style={s.secondaryText}>{avancado ? 'Ocultar detalhes do cálculo  ▴' : 'Personalizar taxas (opcional)  ▾'}</Text>
      </Pressable>
      {avancado && <View style={s.details}>
        <Text style={s.title}>Como a projeção é calculada?</Text>
        <Text style={s.muted}>Estas taxas são hipóteses, não retornos garantidos. Altere apenas se quiser comparar outros resultados.</Text>
        <View style={s.fieldRow}>
          <View style={s.half}><Field label="Retorno anual estimado (%)" value={rentabilidade} onChange={setRentabilidade} hint="Hipótese de rentabilidade antes da inflação." /></View>
          <View style={s.half}><Field label="Inflação anual (%)" value={inflacao} onChange={setInflacao} hint="Ajusta a projeção ao poder de compra atual." /></View>
          <View style={s.half}><Field label="Retirada anual na aposentadoria (%)" value={retirada} onChange={setRetirada} hint="Hipótese para calcular o valor de patrimônio necessário." /></View>
        </View>
      </View>}
    </View>

    <View style={s.card}>
      <View style={s.stepRow}><Text style={s.step}>3</Text><Text style={s.title}>Seu resultado</Text></View>
      <Text style={s.muted}>Os valores abaixo são atualizados automaticamente conforme você digita.</Text>
      {!simulacao ? <Text style={s.error} accessibilityLiveRegion="polite">Revise os números. A idade final deve ser maior que a atual, e os valores e taxas devem estar dentro dos limites permitidos.</Text> : <>
        <View style={s.highlight}>
          <Text style={s.highlightLabel}>Você poderia juntar aos {params.idadeAlvo} anos</Text>
          <Text style={s.highlightValue}>{moeda(simulacao.patrimonioFinal)}</Text>
          <Text style={s.muted}>Estimativa em valores de hoje, investindo por {simulacao.tempoAnos} anos.</Text>
        </View>
        <View style={s.fieldRow}>
          <View style={s.half}><Metric titulo="Patrimônio estimado para gerar a renda desejada" valor={moeda(simulacao.patrimonioAlvo)} detalhe="Meta aproximada conforme a hipótese de retirada anual." /></View>
          <View style={s.half}><Metric titulo="Quanto seria preciso investir ao mês" valor={moeda(simulacao.aporteNecessario)} detalhe="Aporte mensal total estimado, não um valor extra." /></View>
        </View>
        <Text style={s.title}>Quanto da meta você poderia alcançar?</Text>
        <Text style={s.progress}>{simulacao.atingimento.toFixed(1).replace('.', ',')}%</Text>
        <View style={s.track}><View style={[s.trackFill, { width: (simulacao.atingimento + '%') as any }]} /></View>
        <Text style={s.muted}>{simulacao.patrimonioFinal >= simulacao.patrimonioAlvo
          ? 'Nesse cenário, sua projeção alcança a meta.'
          : 'Nesse cenário, a projeção fica abaixo da meta. Experimente alterar o aporte mensal ou o prazo.'}
          {' '}O percentual é apenas uma comparação, não uma chance garantida de sucesso.</Text>
      </>}
    </View>

    {simulacao && <>
      <TrendLine title="Como o patrimônio poderia crescer" values={simulacao.pontos} labels={simulacao.idades} />
      <View style={s.card}>
        <Pressable style={s.secondary} accessibilityRole="button" accessibilityState={{ expanded: cenarios }} onPress={() => setCenarios(x => !x)}>
          <Text style={s.secondaryText}>{cenarios ? 'Ocultar cenários  ▴' : 'Comparar outros resultados  ▾'}</Text>
        </Pressable>
        {cenarios && <>
          <Text style={s.muted}>E se o retorno anual for um pouco maior ou menor que a hipótese inicial?</Text>
          {[-2, 0, 2].map(delta => {
            const taxa = params.rentabilidade + delta;
            const scenario = simularPlano({ ...params, rentabilidade: Math.max(-94, taxa) });
            return <View key={delta} style={s.scenario}>
              <Text style={s.label}>{delta < 0 ? 'Retorno menor' : delta > 0 ? 'Retorno maior' : 'Cenário base'} — {taxa.toFixed(1).replace('.', ',')}% ao ano</Text>
              <Text style={s.scenarioValue}>{moeda(scenario.patrimonioFinal)}</Text>
            </View>;
          })}
        </>}
      </View>
    </>}
    <View style={s.notice}>
      <Text style={s.muted}>Esta é uma simulação educativa, não uma recomendação financeira. Não considera impostos, taxas, oscilações reais do mercado nem mudanças nos aportes. O resultado não é garantido.</Text>
    </View>
  </View>;
}

const base = StyleSheet.create({
  section: { gap: 15 },
  heading: { fontSize: 25, fontWeight: '900', color: '#111827' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', flexShrink: 1 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151' },
  muted: { color: '#6B7280', fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#ECE8F1', borderWidth: 1, borderRadius: 20, padding: 16, gap: 15 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  step: { backgroundColor: '#7C3AED', color: '#FFFFFF', width: 34, height: 34, borderRadius: 17, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', fontSize: 18, fontWeight: '900', lineHeight: 34 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { flex: 1, flexBasis: 260, minWidth: 0 },
  field: { gap: 6, minWidth: 0 },
  input: { backgroundColor: '#FCFBFD', borderColor: '#DDD6E6', borderWidth: 1, borderRadius: 12, color: '#111827', fontSize: 17, paddingHorizontal: 14, minHeight: 50 },
  secondary: { minHeight: 48, backgroundColor: '#F4F1F8', borderColor: '#DDD6E6', borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  secondaryText: { color: '#5B21B6', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  details: { gap: 15 },
  highlight: { backgroundColor: '#EDE9FE', borderRadius: 17, padding: 18, gap: 8 },
  highlightLabel: { color: '#5B21B6', fontWeight: '800', fontSize: 13 },
  highlightValue: { color: '#5B21B6', fontWeight: '900', fontSize: 28 },
  progress: { color: '#6D28D9', fontWeight: '900', fontSize: 27 },
  track: { backgroundColor: '#EDE9FE', height: 13, borderRadius: 12, overflow: 'hidden' },
  trackFill: { backgroundColor: '#7C3AED', height: '100%', borderRadius: 12 },
  scenario: { borderTopWidth: 1, borderTopColor: '#ECE8F1', paddingTop: 12, gap: 5 },
  scenarioValue: { color: '#111827', fontWeight: '900', fontSize: 20 },
  notice: { padding: 15, backgroundColor: '#F4F1F8', borderRadius: 14 },
  error: { color: '#B91C1C', fontSize: 13, lineHeight: 20 },
});
