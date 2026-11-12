import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { OceanPressable as Pressable } from '../../design/OceanControls';
import type { Lancamento } from '../../types/finance';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { Metric, moeda } from './FinanceVisuals';

function csvCell(value: string | number) {
  // Evita fórmulas interpretadas por leitores de CSV, mesmo após espaços iniciais.
  let text = String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function gerarCsv(lancamentos: Lancamento[]) {
  const cab = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'];
  const linhas = lancamentos.map(item => [
    item.data, item.descricao, item.categoria, item.tipo, item.valor.toFixed(2).replace('.', ','),
  ].map(csvCell).join(';'));
  return '\uFEFF' + [cab.map(csvCell).join(';'), ...linhas].join('\r\n');
}

export function DataArea({ lancamentos, periodo }: { lancamentos: Lancamento[]; periodo: string }) {
  const s = useAccessibleStyles(styles);
  const { isDark } = useAccessibility();
  const { width } = useWindowDimensions();
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [categoria, setCategoria] = useState('Todas');
  const [pagina, setPagina] = useState(1);
  const [mensagem, setMensagem] = useState('');
  const categorias = useMemo(() => ['Todas', ...Array.from(new Set(lancamentos.map(x => x.categoria))).sort()], [lancamentos]);
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return lancamentos.filter(item =>
      (tipo === 'todos' || item.tipo === tipo) &&
      (categoria === 'Todas' || item.categoria === categoria) &&
      (!termo || (item.descricao + ' ' + item.categoria + ' ' + item.data).toLocaleLowerCase('pt-BR').includes(termo))
    ).sort((a, b) => b.data.localeCompare(a.data));
  }, [lancamentos, tipo, categoria, busca]);
  const paginaAtual = Math.min(pagina, Math.max(1, Math.ceil(filtrados.length / 15)));
  const exibidos = filtrados.slice((paginaAtual - 1) * 15, paginaAtual * 15);
  const entradas = filtrados.filter(x => x.tipo === 'receita').reduce((n, x) => n + x.valor, 0);
  const saidas = filtrados.filter(x => x.tipo === 'despesa').reduce((n, x) => n + x.valor, 0);
  const totalCategoria = useMemo(() => {
    const vals: Record<string, number> = {};
    filtrados.filter(x => x.tipo === 'despesa').forEach(x => { vals[x.categoria] = (vals[x.categoria] || 0) + x.valor; });
    return Object.entries(vals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtrados]);
  function exportar() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setMensagem('Exportação CSV disponível no site. No celular, acesse a versão web para exportar.');
      return;
    }
    const arquivo = new Blob([gerarCsv(filtrados)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(arquivo);
    const elemento = document.createElement('a');
    elemento.href = url;
    elemento.download = 'financeiro-' + periodo.replace(/\W/g, '-') + '.csv';
    document.body.appendChild(elemento);
    elemento.click();
    elemento.remove();
    URL.revokeObjectURL(url);
    setMensagem('Arquivo CSV gerado com os filtros atuais.');
  }
  const chip = (label: string, ativo: boolean, onPress: () => void) =>
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: ativo }}
      onPress={onPress} style={[s.chip, ativo && s.chipActive]}>
      <Text style={[s.chipText, ativo && s.chipTextActive]}>{label}</Text>
    </Pressable>;

  return (
    <View style={s.section}>
      <Text style={s.heading}>Central de Dados</Text>
      <Text style={s.subtle}>Explore seus lançamentos de {periodo}, aplique filtros e exporte somente os dados visíveis após a filtragem.</Text>
      <View style={s.row}>
        <Metric titulo="Receitas filtradas" valor={moeda(entradas)} />
        <Metric titulo="Despesas filtradas" valor={moeda(saidas)} />
        <Metric titulo="Resultado filtrado" valor={moeda(entradas - saidas)} />
        <Metric titulo="Registros" valor={String(filtrados.length)} />
      </View>
      <View style={s.card}>
        <View style={s.top}>
          <Text style={s.title}>Transações</Text>
          <Pressable onPress={exportar} accessibilityRole="button" style={s.export}>
            <Text style={s.exportText}>Exportar CSV</Text>
          </Pressable>
        </View>
        {mensagem ? <Text accessibilityLiveRegion="polite" style={s.subtle}>{mensagem}</Text> : null}
        <TextInput value={busca} onChangeText={v => { setBusca(v); setPagina(1); }}
          style={s.input} placeholder="Buscar descrição, categoria ou data..." accessibilityLabel="Pesquisar transações"
          placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
        <View style={s.row}>
          {chip('Todos', tipo === 'todos', () => { setTipo('todos'); setPagina(1); })}
          {chip('Receitas', tipo === 'receita', () => { setTipo('receita'); setPagina(1); })}
          {chip('Despesas', tipo === 'despesa', () => { setTipo('despesa'); setPagina(1); })}
        </View>
        <Text style={s.subtle}>Categorias</Text>
        <View style={s.row}>{categorias.map(item => chip(item, categoria === item, () => { setCategoria(item); setPagina(1); }))}</View>
        {filtrados.length === 0 ? <Text style={s.empty}>Nenhum lançamento encontrado neste período com os filtros selecionados.</Text> : (
          <View style={s.table}>
            {width >= 780 && <View style={[s.dataRow, s.headerRow]}>
              <Text style={[s.cell, s.date]}>Data</Text>
              <Text style={[s.cell, s.description]}>Descrição</Text>
              <Text style={[s.cell, s.category]}>Categoria</Text>
              <Text style={[s.cell, s.value]}>Valor</Text>
            </View>}
            {exibidos.map(item => width >= 780 ? (
              <View key={item.id} style={s.dataRow}>
                <Text style={[s.cell, s.date]}>{item.data.split('-').reverse().join('/')}</Text>
                <Text style={[s.cell, s.description]}>{item.descricao}</Text>
                <Text style={[s.cell, s.category]}>{item.categoria}</Text>
                <Text style={[s.cell, s.value, { color: item.tipo === 'receita' ? '#15803D' : '#B91C1C' }]}>
                  {item.tipo === 'receita' ? '+' : '−'} {moeda(item.valor)}
                </Text>
              </View>
            ) : (
              <View key={item.id} style={s.mobileRow}>
                <View style={s.top}>
                  <Text style={s.descriptionText}>{item.descricao}</Text>
                  <Text style={item.tipo === 'receita' ? s.positive : s.negative}>
                    {item.tipo === 'receita' ? '+' : '−'} {moeda(item.valor)}
                  </Text>
                </View>
                <Text style={s.subtle}>{item.data.split('-').reverse().join('/')} · {item.categoria}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={s.top}>
          <Text style={s.subtle}>Página {paginaAtual} de {Math.max(1, Math.ceil(filtrados.length / 15))}</Text>
          <View style={s.row}>
            {chip('Anterior', false, () => setPagina(Math.max(1, paginaAtual - 1)))}
            {chip('Próxima', false, () => setPagina(Math.min(Math.ceil(filtrados.length / 15), paginaAtual + 1)))}
          </View>
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.title}>Maiores categorias de despesas</Text>
        {totalCategoria.length === 0 ? <Text style={s.subtle}>Ainda não há despesas nesse recorte.</Text> : totalCategoria.map(([nome, valor]) => (
          <View key={nome} style={s.top}>
            <Text style={s.descriptionText}>{nome}</Text>
            <Text style={s.descriptionText}>{moeda(valor)}</Text>
          </View>
        ))}
        <Text style={s.subtle}>Os valores refletem apenas os lançamentos do mês e filtros escolhidos. Não incluem dados de carteiras compartilhadas.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16 },
  heading: { color: '#111827', fontSize: 25, fontWeight: '900' },
  title: { color: '#111827', fontSize: 19, fontWeight: '800' },
  subtle: { color: '#6B7280', fontSize: 12, lineHeight: 19 },
  descriptionText: { color: '#374151', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  empty: { color: '#6B7280', paddingVertical: 20, fontSize: 14 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE8F1', borderRadius: 20, padding: 16, gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  top: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 12, minHeight: 43, borderWidth: 1, borderColor: '#DDD6E6', borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  chipActive: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  chipTextActive: { color: '#5B21B6' },
  input: { borderColor: '#DDD6E6', borderWidth: 1, borderRadius: 12, backgroundColor: '#FCFBFD', color: '#111827', minHeight: 48, paddingHorizontal: 14, fontSize: 14 },
  export: { backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, borderRadius: 12 },
  exportText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  table: { gap: 0 },
  dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ECE8F1', minHeight: 48, alignItems: 'center', paddingVertical: 8, gap: 8 },
  headerRow: { backgroundColor: '#F4F1F8' },
  cell: { color: '#374151', fontSize: 12 },
  date: { flexBasis: 94 },
  description: { flexGrow: 2, flexBasis: 160 },
  category: { flexGrow: 1, flexBasis: 110 },
  value: { flexBasis: 140, textAlign: 'right', fontWeight: '700' },
  mobileRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#ECE8F1', gap: 5 },
  positive: { fontSize: 13, fontWeight: '800', color: '#15803D' },
  negative: { fontSize: 13, fontWeight: '800', color: '#B91C1C' },
});
