import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
      <Text style={styles.rotulo}>Fatura atual</Text>
      <Text style={styles.fatura}>{moeda(totalDespesas)}</Text>

      <View style={styles.linhaResumo}>
        <View>
          <Text style={styles.miniRotulo}>Limite do mês</Text>
          <Text style={styles.miniValor}>{limite > 0 ? moeda(limite) : 'Não definido'}</Text>
        </View>
        <View style={styles.alinharDireita}>
          <Text style={styles.miniRotulo}>Disponível</Text>
          <Text style={[styles.miniValor, estourou && styles.alerta]}>
            {estourou ? `Excedido em ${moeda(totalDespesas - limite)}` : moeda(disponivel)}
          </Text>
        </View>
      </View>

      <View style={styles.barraFundo}>
        <View style={[styles.barraUso, { width: `${percentual}%` }]} />
      </View>
      <Text style={styles.percentual}>{limite > 0 ? `${Math.round((totalDespesas / limite) * 100)}% do limite utilizado` : 'Defina um limite mensal para acompanhar seus gastos'}</Text>

      {editando ? (
        <View style={styles.edicao}>
          <TextInput
            value={valor}
            onChangeText={setValor}
            placeholder="Ex.: 3000,00"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          <View style={styles.acoes}>
            {limite > 0 ? (
              <Pressable style={styles.cancelar} onPress={() => setEditando(false)} disabled={salvando}>
                <Text style={styles.cancelarTexto}>Cancelar</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.salvar} onPress={salvar} disabled={salvando}>
              <Text style={styles.salvarTexto}>{salvando ? 'Salvando...' : 'Salvar limite'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.alterar} onPress={() => setEditando(true)}>
          <Text style={styles.alterarTexto}>Alterar limite do mês</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#ECE8F1',
    gap: 12,
  },
  rotulo: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  fatura: { fontSize: 34, color: '#111827', fontWeight: '800' },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginTop: 4 },
  alinharDireita: { alignItems: 'flex-end', flex: 1 },
  miniRotulo: { fontSize: 12, color: '#6B7280' },
  miniValor: { fontSize: 14, color: '#111827', fontWeight: '700', marginTop: 3 },
  alerta: { color: '#B91C1C' },
  barraFundo: { height: 8, borderRadius: 99, backgroundColor: '#EDE9FE', overflow: 'hidden', marginTop: 4 },
  barraUso: { height: '100%', borderRadius: 99, backgroundColor: '#7C3AED' },
  percentual: { fontSize: 12, color: '#6B7280' },
  alterar: { alignSelf: 'flex-start', paddingVertical: 8 },
  alterarTexto: { color: '#7C3AED', fontWeight: '800' },
  edicao: { gap: 8, marginTop: 4 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 14, fontSize: 16, backgroundColor: '#FFFFFF' },
  erro: { color: '#B91C1C', fontSize: 13 },
  acoes: { flexDirection: 'row', gap: 10 },
  cancelar: { flex: 1, paddingVertical: 11, borderRadius: 999, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelarTexto: { fontWeight: '700', color: '#4B5563' },
  salvar: { flex: 1, paddingVertical: 11, borderRadius: 999, alignItems: 'center', backgroundColor: '#7C3AED' },
  salvarTexto: { color: '#FFFFFF', fontWeight: '800' },
});
