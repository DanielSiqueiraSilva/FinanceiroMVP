import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Lancamento } from '../../types/finance';

type TransactionItemProps = {
  lancamento: Lancamento;
  onEditar: (lancamento: Lancamento) => void;
  onExcluir: (id: string) => void;
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function TransactionItem({ lancamento, onEditar, onExcluir }: TransactionItemProps) {
  function confirmarExclusao() {
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
          <Text style={styles.descricao}>{lancamento.descricao}</Text>
          <Text style={[styles.valor, receita ? styles.receita : styles.despesa]}>
            {receita ? '+' : '-'} {formatarMoeda(lancamento.valor)}
          </Text>
        </View>

        <Text style={styles.meta}>
          {lancamento.categoria} • {formatarData(lancamento.data)}
        </Text>
      </View>

      <View style={styles.acoes}>
        <Pressable style={styles.botaoSecundario} onPress={() => onEditar(lancamento)}>
          <Text style={styles.botaoSecundarioTexto}>Editar</Text>
        </Pressable>
        <Pressable style={styles.botaoExcluir} onPress={confirmarExclusao}>
          <Text style={styles.botaoExcluirTexto}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 14,
  },
  informacoes: {
    gap: 6,
  },
  linhaTitulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  descricao: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  valor: {
    fontSize: 15,
    fontWeight: '700',
  },
  receita: {
    color: '#15803D',
  },
  despesa: {
    color: '#B91C1C',
  },
  meta: {
    color: '#6B7280',
    fontSize: 13,
  },
  acoes: {
    flexDirection: 'row',
    gap: 10,
  },
  botaoSecundario: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  botaoSecundarioTexto: {
    color: '#374151',
    fontWeight: '600',
  },
  botaoExcluir: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
  },
  botaoExcluirTexto: {
    color: '#991B1B',
    fontWeight: '600',
  },
});
