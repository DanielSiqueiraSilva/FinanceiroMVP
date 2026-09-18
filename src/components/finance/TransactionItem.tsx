import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { Lancamento } from '../../types/finance';
import { AppButton } from './AppButton';

type TransactionItemProps = {
  lancamento: Lancamento;
  onEditar: (lancamento: Lancamento) => void;
  onExcluir: (id: string) => void;
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function TransactionItem({ lancamento, onEditar, onExcluir }: TransactionItemProps) {
  function confirmarExclusao() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Excluir "${lancamento.descricao}"?\n\nEsta ação não pode ser desfeita.`)) {
        onExcluir(lancamento.id);
      }
      return;
    }

    Alert.alert('Excluir lançamento', 'Deseja realmente excluir este lançamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => onExcluir(lancamento.id) },
    ]);
  }

  const receita = lancamento.tipo === 'receita';

  return (
    <View style={styles.container}>
      <View style={styles.informacoes}>
        <View style={styles.linhaTitulo}>
          <View style={styles.textos}>
            <Text style={styles.descricao}>{lancamento.descricao}</Text>
            <View style={styles.metaLinha}>
              <View style={styles.categoriaBadge}><Text style={styles.categoriaTexto}>{lancamento.categoria}</Text></View>
              <Text style={styles.meta}>{formatarData(lancamento.data)}</Text>
            </View>
          </View>
          <Text style={[styles.valor, receita ? styles.receita : styles.despesa]}>
            {receita ? '+' : '-'} {formatarMoeda(lancamento.valor)}
          </Text>
        </View>
      </View>
      <View style={styles.acoes}>
        <AppButton title="Editar" variant="secondary" onPress={() => onEditar(lancamento)} style={styles.botao} />
        <AppButton title="Excluir" variant="danger" onPress={confirmarExclusao} style={styles.botao} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE8F1',
    gap: 14,
  },
  informacoes: { gap: 6 },
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
  textos: { flex: 1, gap: 8 },
  descricao: { color: '#111827', fontSize: 16, fontWeight: '700' },
  valor: { fontSize: 15, fontWeight: '800' },
  receita: { color: '#15803D' },
  despesa: { color: '#B91C1C' },
  metaLinha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  categoriaBadge: { backgroundColor: '#F4F1F8', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  categoriaTexto: { color: '#5B21B6', fontSize: 12, fontWeight: '700' },
  meta: { color: '#6B7280', fontSize: 12 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  botao: { flexGrow: 1, flexBasis: 120 },
});
