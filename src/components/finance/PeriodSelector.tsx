import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
    },
    periodo: {
      alignItems: 'center',
    },
    mes: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    ano: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    botao: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
    },
    botaoTexto: {
      fontSize: 28,
      color: colors.arrow,
      lineHeight: 30,
    },
  });
}
