import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { AppButton } from './AppButton';

type Props = {
  totalDespesas: number;
  limite: number;
  salvando: boolean;
  onSalvarLimite: (valor: number) => Promise<void>;
};

function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export function MonthlyOverview({ totalDespesas, limite, salvando, onSalvarLimite }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [valor, setValor] = useState(limite > 0 ? String(limite).replace('.', ',') : '');
  const [editando, setEditando] = useState(limite <= 0);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setValor(limite > 0 ? String(limite).replace('.', ',') : '');
    if (limite > 0) setEditando(false);
  }, [limite]);

  const percentual = limite > 0 ? Math.min((totalDespesas / limite) * 100, 100) : 0;
  const disponivel = Math.max(limite - totalDespesas, 0);
  const estourou = limite > 0 && totalDespesas > limite;

  async function salvar() {
    setErro('');
    const numero = Number(valor.replace(',', '.'));
    if (!Number.isFinite(numero) || numero < 0) {
      setErro('Informe um limite válido.');
      return;
    }
    await onSalvarLimite(numero);
    setEditando(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.topo}>
        <View>
          <Text style={styles.rotulo}>Fatura atual</Text>
          <Text style={styles.fatura}>{moeda(totalDespesas)}</Text>
        </View>
        <View style={styles.status}><Text style={styles.statusTexto}>{limite > 0 ? `${Math.round((totalDespesas / limite) * 100)}% usado` : 'Sem limite'}</Text></View>
      </View>

      <View style={styles.linhaResumo}>
        <View style={styles.resumoItem}>
          <Text style={styles.miniRotulo}>Limite do mês</Text>
          <Text style={styles.miniValor}>{limite > 0 ? moeda(limite) : 'Não definido'}</Text>
        </View>
        <View style={[styles.resumoItem, styles.alinharDireita]}>
          <Text style={styles.miniRotulo}>Disponível</Text>
          <Text style={[styles.miniValor, estourou && styles.alerta]}>
            {estourou ? `Excedido em ${moeda(totalDespesas - limite)}` : moeda(disponivel)}
          </Text>
        </View>
      </View>

      <View style={styles.barraFundo}><View style={[styles.barraUso, { width: `${percentual}%` }]} /></View>
      <Text style={styles.percentual}>{limite > 0 ? `${Math.round((totalDespesas / limite) * 100)}% do limite utilizado` : 'Defina um limite mensal para acompanhar seus gastos.'}</Text>

      {editando ? (
        <View style={styles.edicao}>
          <TextInput
            value={valor}
            onChangeText={setValor}
            placeholder="Ex.: 3000,00"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          <View style={styles.acoes}>
            {limite > 0 ? <AppButton title="Cancelar" variant="secondary" onPress={() => setEditando(false)} disabled={salvando} style={styles.botao} /> : null}
            <AppButton title={salvando ? 'Salvando...' : 'Salvar limite'} onPress={salvar} disabled={salvando} style={styles.botao} />
          </View>
        </View>
      ) : (
        <AppButton title="Alterar limite do mês" variant="secondary" onPress={() => setEditando(true)} />
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: colors.border, gap: 14 },
    topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
    rotulo: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
    fatura: { fontSize: 34, color: colors.textPrimary, fontWeight: '800', marginTop: 3 },
    status: { backgroundColor: colors.accentSoftBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    statusTexto: { color: colors.accentSoftText, fontSize: 12, fontWeight: '800' },
    linhaResumo: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginTop: 2 },
    resumoItem: { flex: 1 },
    alinharDireita: { alignItems: 'flex-end' },
    miniRotulo: { fontSize: 12, color: colors.textSecondary },
    miniValor: { fontSize: 14, color: colors.textPrimary, fontWeight: '700', marginTop: 3 },
    alerta: { color: colors.negative },
    barraFundo: { height: 9, borderRadius: 99, backgroundColor: colors.accentSoftBg, overflow: 'hidden', marginTop: 2 },
    barraUso: { height: '100%', borderRadius: 99, backgroundColor: colors.accentStrong },
    percentual: { fontSize: 12, color: colors.textSecondary },
    edicao: { gap: 10, marginTop: 2 },
    input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, backgroundColor: colors.inputBg, color: colors.textPrimary },
    erro: { color: colors.negative, fontSize: 13 },
    acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    botao: { flexGrow: 1, flexBasis: 150 },
  });
}
