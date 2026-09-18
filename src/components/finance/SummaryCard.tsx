import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

type SummaryCardProps = {
  titulo: string;
  valor: string;
  destaque?: 'positivo' | 'negativo' | 'neutro';
};

export function SummaryCard({ titulo, valor, destaque = 'neutro' }: SummaryCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text
        style={[
          styles.valor,
          destaque === 'positivo' && styles.positivo,
          destaque === 'negativo' && styles.negativo,
        ]}
      >
        {valor}
      </Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 140,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    titulo: {
      color: colors.textSecondary,
      fontSize: 13,
      marginBottom: 8,
    },
    valor: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '700',
    },
    positivo: {
      color: colors.positive,
    },
    negativo: {
      color: colors.negative,
    },
  });
}
