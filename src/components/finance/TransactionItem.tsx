import { useMemo } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { Lancamento } from '../../types/finance';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    informacoes: { gap: 6 },
    linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
    textos: { flex: 1, gap: 8 },
    descricao: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
    valor: { fontSize: 15, fontWeight: '800' },
    receita: { color: colors.positive },
    despesa: { color: colors.negative },
    metaLinha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    categoriaBadge: { backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    categoriaTexto: { color: colors.accentSoftText, fontSize: 12, fontWeight: '700' },
    meta: { color: colors.textSecondary, fontSize: 12 },
    acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    botao: { flexGrow: 1, flexBasis: 120 },
  });
}
