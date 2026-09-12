import { StyleSheet, Text, View } from 'react-native';

type SummaryCardProps = {
  titulo: string;
  valor: string;
  destaque?: 'positivo' | 'negativo' | 'neutro';
};

export function SummaryCard({ titulo, valor, destaque = 'neutro' }: SummaryCardProps) {
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

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  titulo: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 8,
  },
  valor: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  positivo: {
    color: '#15803D',
  },
  negativo: {
    color: '#B91C1C',
  },
});
