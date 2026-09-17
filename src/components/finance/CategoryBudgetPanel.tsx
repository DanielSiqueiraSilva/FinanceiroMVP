import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CATEGORIAS } from './TransactionForm';
import { Lancamento } from '../../types/finance';

type Props = {
  lancamentos: Lancamento[];
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function percentualSeguro(gasto: number, meta: number) {
  if (meta <= 0) return gasto > 0 ? 100 : 0;
  return Math.min((gasto / meta) * 100, 100);
}

export function CategoryBudgetPanel({ lancamentos }: Props) {
  const [metas, setMetas] = useState<Record<string, string>>({
    Alimentação: '600',
    Contas: '800',
    Lazer: '300',
    Transporte: '400',
    Compras pessoais: '300',
    Saúde: '300',
    Educação: '300',
    Viagens: '500',
    Outros: '250',
  });
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);

  const gastosPorCategoria = useMemo(() => {
    return lancamentos
      .filter((item) => item.tipo === 'despesa')
      .reduce<Record<string, number>>((totais, item) => {
        totais[item.categoria] = (totais[item.categoria] ?? 0) + item.valor;
        return totais;
      }, {});
  }, [lancamentos]);

  const categoriasComGasto = useMemo(() => {
    return CATEGORIAS.filter((categoria) => categoria !== 'Salário' && categoria !== 'Contas' || (gastosPorCategoria[categoria] ?? 0) > 0);
  }, [gastosPorCategoria]);

  function atualizarMeta(categoria: string, valor: string) {
    setMetas((metasAtuais) => ({ ...metasAtuais, [categoria]: valor.replace(/[^\d,]/g, '') }));
  }

  return (
    <View style={styles.card}>
      <View style={styles.cabecalho}>
        <View style={styles.cabecalhoTexto}>
          <Text style={styles.titulo}>Metas por categoria</Text>
          <Text style={styles.subtitulo}>Acompanhe seus gastos e ajuste seus limites mensais.</Text>
        </View>
        <View style={styles.icone}><Text style={styles.iconeTexto}>↗</Text></View>
      </View>

      <View style={styles.lista}>
        {categoriasComGasto.map((categoria) => {
          const gasto = gastosPorCategoria[categoria] ?? 0;
          const meta = Number((metas[categoria] ?? '0').replace(',', '.')) || 0;
          const percentual = percentualSeguro(gasto, meta);
          const estourou = meta > 0 && gasto >= meta;
          const quaseNoLimite = !estourou && meta > 0 && percentual >= 80;
          const aberta = categoriaAberta === categoria;
          const restante = Math.max(meta - gasto, 0);

          return (
            <View key={categoria} style={styles.item}>
              <Pressable style={styles.itemCabecalho} onPress={() => setCategoriaAberta(aberta ? null : categoria)}>
                <View style={styles.nomeArea}>
                  <Text style={styles.categoria}>{categoria}</Text>
                  <Text style={styles.valores}>{formatarMoeda(gasto)} de {formatarMoeda(meta)}</Text>
                </View>
                <View style={styles.statusArea}>
                  <Text style={[styles.status, estourou && styles.statusVermelho, quaseNoLimite && styles.statusAmarelo]}>
                    {estourou ? 'Acima da meta' : quaseNoLimite ? 'Atenção' : 'No controle'}
                  </Text>
                  <Text style={styles.chevron}>{aberta ? '⌃' : '⌄'}</Text>
                </View>
              </Pressable>

              <View style={styles.barraFundo}>
                <View style={[styles.barra, estourou ? styles.barraVermelha : quaseNoLimite ? styles.barraAmarela : styles.barraVerde, { width: `${percentual}%` }]} />
              </View>

              <View style={styles.rodape}>
                <Text style={styles.restante}>{meta > 0 ? `Restante: ${formatarMoeda(restante)}` : 'Defina uma meta para acompanhar'}</Text>
                <Text style={styles.percentual}>{Math.round(percentual)}%</Text>
              </View>

              {aberta ? (
                <View style={styles.edicao}>
                  <Text style={styles.edicaoRotulo}>Meta mensal para {categoria}</Text>
                  <View style={styles.edicaoLinha}>
                    <TextInput
                      value={metas[categoria] ?? ''}
                      onChangeText={(valor) => atualizarMeta(categoria, valor)}
                      keyboardType="decimal-pad"
                      placeholder="Ex.: 500,00"
                      style={styles.input}
                    />
                    <Text style={styles.moeda}>BRL</Text>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {categoriasComGasto.length === 0 ? (
        <Text style={styles.vazio}>Cadastre uma despesa para acompanhar suas metas por categoria.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#ECE8F1', padding: 20, gap: 18 },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cabecalhoTexto: { flex: 1, gap: 4 },
  titulo: { color: '#111827', fontSize: 21, fontWeight: '800' },
  subtitulo: { color: '#6B7280', fontSize: 13, lineHeight: 19 },
  icone: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  iconeTexto: { color: '#6D28D9', fontSize: 21, fontWeight: '900' },
  lista: { gap: 12 },
  item: { padding: 14, borderRadius: 16, backgroundColor: '#FCFBFD', borderWidth: 1, borderColor: '#F0ECF4', gap: 9 },
  itemCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  nomeArea: { flex: 1, gap: 3 },
  categoria: { color: '#1F2937', fontSize: 15, fontWeight: '800' },
  valores: { color: '#6B7280', fontSize: 12 },
  statusArea: { alignItems: 'flex-end', gap: 2 },
  status: { color: '#047857', fontSize: 11, fontWeight: '800' },
  statusAmarelo: { color: '#B45309' },
  statusVermelho: { color: '#B91C1C' },
  chevron: { color: '#9CA3AF', fontSize: 16, lineHeight: 16 },
  barraFundo: { height: 9, borderRadius: 999, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  barra: { height: 9, borderRadius: 999 },
  barraVerde: { backgroundColor: '#10B981' },
  barraAmarela: { backgroundColor: '#F59E0B' },
  barraVermelha: { backgroundColor: '#EF4444' },
  rodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restante: { color: '#6B7280', fontSize: 12 },
  percentual: { color: '#374151', fontSize: 12, fontWeight: '800' },
  edicao: { paddingTop: 6, gap: 7 },
  edicaoRotulo: { color: '#4B5563', fontSize: 12, fontWeight: '700' },
  edicaoLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: '#DDD6E6', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#FFFFFF', color: '#111827' },
  moeda: { color: '#6B7280', fontSize: 12, fontWeight: '800' },
  vazio: { color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
