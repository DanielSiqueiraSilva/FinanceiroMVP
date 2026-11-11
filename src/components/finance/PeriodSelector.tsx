import { useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  useWindowDimensions,
} from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { OceanGlass } from '../../design/OceanGlass';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const ANO_MIN = 2000;
const ANO_MAX = 2100;

type PeriodSelectorProps = {
  mes: number;
  ano: number;
  onSelecionar: (mes: number, ano: number) => void;
};

/** Um toque no período abre a grade de meses; o ano pode ser escolhido diretamente. */
export function PeriodSelector({ mes, ano, onSelecionar }: PeriodSelectorProps) {
  const s = useAccessibleStyles(base);
  const { isDark } = useAccessibility();
  const { width, height } = useWindowDimensions();
  const [aberto, setAberto] = useState(false);
  const [anoVisivel, setAnoVisivel] = useState(ano);
  const [anoTexto, setAnoTexto] = useState(String(ano));
  const [erro, setErro] = useState('');
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  function abrir() {
    setAnoVisivel(ano);
    setAnoTexto(String(ano));
    setErro('');
    setAberto(true);
  }
  function alterarAno(delta: number) {
    const proximo = Math.min(ANO_MAX, Math.max(ANO_MIN, anoVisivel + delta));
    setAnoVisivel(proximo);
    setAnoTexto(String(proximo));
    setErro('');
  }
  function irParaAno() {
    const valor = Number(anoTexto.trim());
    if (!Number.isInteger(valor) || valor < ANO_MIN || valor > ANO_MAX) {
      setErro('Escolha um ano entre 2000 e 2100.');
      return;
    }
    setAnoVisivel(valor);
    setAnoTexto(String(valor));
    setErro('');
  }
  function selecionar(indice: number) {
    onSelecionar(indice + 1, anoVisivel);
    setAberto(false);
  }
  function voltarAoAtual() {
    const agora = new Date();
    onSelecionar(agora.getMonth() + 1, agora.getFullYear());
    setAberto(false);
  }

  return (
    <>
      <OceanGlass material="button" radius={18} style={[
        s.periodSurface,
        { borderColor: focused ? (isDark ? '#8DF7EE' : '#087FA5') :
          hovered ? 'rgba(51,213,217,.72)' : isDark ? '#355F74' : '#CBE2EC' },
      ]}>
      <Pressable
        style={[s.periodo, { backgroundColor: 'transparent', borderWidth: 0 }]}
        onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        accessibilityRole="button"
        accessibilityLabel={'Selecionar mês e ano. Atual: ' + MESES[mes - 1] + ' de ' + ano}
        accessibilityHint="Abre calendário para escolher mês e ano sem avançar um mês de cada vez"
        onPress={abrir}
      >
        <Text style={s.calendario}>▦</Text>
        <View style={s.periodoTexto}>
          <Text style={s.label}>Período selecionado</Text>
          <Text style={s.periodoValor}>{MESES[mes - 1]} de {ano}</Text>
        </View>
        <Text style={s.abrirIcone}>Alterar  ▾</Text>
      </Pressable>
      </OceanGlass>
      <Modal
        visible={aberto}
        transparent
        animationType="fade"
        onRequestClose={() => setAberto(false)}
      >
        <View style={s.overlay}>
          <Pressable
            style={s.backdrop}
            onPress={() => setAberto(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar seleção de período"
          />
          <OceanGlass material="floating" radius={22} style={[s.popup, { width: Math.min(width - 24, 430), maxHeight: Math.max(280, height - 32) }]}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.popupContent}>
              <View style={s.topo}>
                <View style={s.topoTexto}>
                  <Text style={s.titulo} accessibilityRole="header">Escolher mês</Text>
                  <Text style={s.ajuda}>Toque no mês desejado. Não é preciso selecionar um dia.</Text>
                </View>
                <Pressable style={s.fechar} onPress={() => setAberto(false)} accessibilityRole="button" accessibilityLabel="Fechar calendário">
                  <Text style={s.fecharTexto}>✕</Text>
                </Pressable>
              </View>
              <View style={s.anoLinha}>
                <Pressable style={s.anoBotao} onPress={() => alterarAno(-1)} disabled={anoVisivel <= ANO_MIN} accessibilityRole="button" accessibilityLabel="Ano anterior">
                  <Text style={s.anoBotaoTexto}>‹</Text>
                </Pressable>
                <Text style={s.anoTitulo}>{anoVisivel}</Text>
                <Pressable style={s.anoBotao} onPress={() => alterarAno(1)} disabled={anoVisivel >= ANO_MAX} accessibilityRole="button" accessibilityLabel="Próximo ano">
                  <Text style={s.anoBotaoTexto}>›</Text>
                </Pressable>
              </View>
              <View style={s.irAnoLinha}>
                <Text style={s.anoDica}>Ou vá direto ao ano:</Text>
                <TextInput
                  value={anoTexto}
                  onChangeText={setAnoTexto}
                  keyboardType="number-pad"
                  accessibilityLabel="Digite o ano"
                  maxLength={4}
                  style={s.anoInput}
                  placeholder="2026"
                  placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'}
                  onSubmitEditing={irParaAno}
                />
                <Pressable style={s.irBotao} onPress={irParaAno} accessibilityRole="button">
                  <Text style={s.irTexto}>Ir</Text>
                </Pressable>
              </View>
              {erro ? <Text style={s.erro} accessibilityLiveRegion="polite">{erro}</Text> : null}
              <View style={s.meses}>
                {MESES.map((nome, indice) => {
                  const ativo = mes === indice + 1 && ano === anoVisivel;
                  return (
                    <Pressable
                      key={nome}
                      style={[s.mesBotao, ativo && s.mesAtivo]}
                      onPress={() => selecionar(indice)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: ativo }}
                      accessibilityLabel={nome + ' de ' + anoVisivel}
                    >
                      <Text style={[s.mesTexto, ativo && s.mesTextoAtivo]}>{nome.slice(0, 3)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={s.rodape}>
                <Pressable onPress={voltarAoAtual} accessibilityRole="button" style={s.hoje}>
                  <Text style={s.hojeTexto}>Mês atual</Text>
                </Pressable>
                <Pressable onPress={() => setAberto(false)} accessibilityRole="button" style={s.cancelar}>
                  <Text style={s.cancelarTexto}>Cancelar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </OceanGlass>
        </View>
      </Modal>
    </>
  );
}

const base = StyleSheet.create({
  periodSurface: { alignSelf: 'flex-start', maxWidth: '100%' },
  periodo: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64,
    borderRadius: 18, borderWidth: 1, borderColor: '#DDD6E6', backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 11 },
  calendario: { fontSize: 25, color: '#7C3AED' },
  periodoTexto: { flex: 1, minWidth: 0 },
  label: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  periodoValor: { color: '#111827', fontSize: 17, fontWeight: '800', marginTop: 2 },
  abrirIcone: { color: '#6D28D9', fontSize: 12, fontWeight: '800' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  popup: { borderWidth: 1, borderColor: '#DDD6E6', borderRadius: 22, overflow: 'hidden' },
  popupContent: { padding: 18, gap: 16 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  topoTexto: { flex: 1, gap: 5 },
  titulo: { fontSize: 21, color: '#111827', fontWeight: '900' },
  ajuda: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  fechar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderRadius: 22 },
  fecharTexto: { color: '#374151', fontSize: 17 },
  anoLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F4F1F8', borderRadius: 14, padding: 5 },
  anoBotao: { width: 48, height: 46, alignItems: 'center', justifyContent: 'center' },
  anoBotaoTexto: { fontSize: 30, fontWeight: '700', color: '#6D28D9' },
  anoTitulo: { fontSize: 21, fontWeight: '900', color: '#111827' },
  irAnoLinha: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  anoDica: { fontSize: 12, color: '#6B7280' },
  anoInput: { width: 86, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#DDD6E6', backgroundColor: '#FCFBFD', color: '#111827', fontSize: 16, textAlign: 'center' },
  irBotao: { minWidth: 52, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED' },
  irTexto: { color: '#FFFFFF', fontWeight: '800' },
  erro: { color: '#B91C1C', fontSize: 12 },
  meses: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'space-between' },
  mesBotao: { width: '22.5%', minHeight: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCFBFD', borderColor: '#DDD6E6', borderWidth: 1, borderRadius: 11 },
  mesAtivo: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  mesTexto: { color: '#374151', fontSize: 14, fontWeight: '800' },
  mesTextoAtivo: { color: '#FFFFFF' },
  rodape: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  hoje: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: '#EDE9FE', borderRadius: 12 },
  hojeTexto: { color: '#5B21B6', fontSize: 13, fontWeight: '800' },
  cancelar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  cancelarTexto: { color: '#374151', fontSize: 13, fontWeight: '700' },
});
