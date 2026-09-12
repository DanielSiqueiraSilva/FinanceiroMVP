import { Pressable, StyleSheet, Text, View } from 'react-native';

const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

type PeriodSelectorProps = {
  mes: number;
  ano: number;
  onAnterior: () => void;
  onProximo: () => void;
};

export function PeriodSelector({ mes, ano, onAnterior, onProximo }: PeriodSelectorProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.botao} onPress={onAnterior} accessibilityRole="button">
        <Text style={styles.botaoTexto}>‹</Text>
      </Pressable>

      <View style={styles.periodo}>
        <Text style={styles.mes}>{NOMES_MESES[mes - 1]}</Text>
        <Text style={styles.ano}>{ano}</Text>
      </View>

      <Pressable style={styles.botao} onPress={onProximo} accessibilityRole="button">
        <Text style={styles.botaoTexto}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
  },
  periodo: {
    alignItems: 'center',
  },
  mes: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  ano: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  botao: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  botaoTexto: {
    fontSize: 28,
    color: '#166534',
    lineHeight: 30,
  },
});
