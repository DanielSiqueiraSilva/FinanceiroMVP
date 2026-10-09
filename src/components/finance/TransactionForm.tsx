import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Lancamento, LancamentoInput, TipoLancamento } from '../../types/finance';
import { AppButton } from './AppButton';

export const CATEGORIAS = [
  'Salário',
  'Contas',
  'Alimentação',
  'Lazer',
  'Viagens',
  'Transporte',
  'Compras pessoais',
  'Saúde',
  'Educação',
  'Outros',
] as const;

type TransactionFormProps = {
  mes: number;
  ano: number;
  lancamentoEmEdicao: Lancamento | null;
  salvando: boolean;
  onSalvar: (input: LancamentoInput) => Promise<void>;
  onCancelarEdicao: () => void;
};

function dataPadraoPeriodo(mes: number, ano: number) {
  const hoje = new Date();
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
  const dia = Math.min(hoje.getDate(), ultimoDiaDoMes);

  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function TransactionForm({
  mes,
  ano,
  lancamentoEmEdicao,
  salvando,
  onSalvar,
  onCancelarEdicao,
}: TransactionFormProps) {
  const styles = useAccessibleStyles(baseStyles);
  const { isDark } = useAccessibility();
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<string>('Outros');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(() => dataPadraoPeriodo(mes, ano));
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (lancamentoEmEdicao) {
      setTipo(lancamentoEmEdicao.tipo);
      setDescricao(lancamentoEmEdicao.descricao);
      setCategoria(
        CATEGORIAS.includes(lancamentoEmEdicao.categoria as (typeof CATEGORIAS)[number])
          ? lancamentoEmEdicao.categoria
          : 'Outros'
      );
      setValor(String(lancamentoEmEdicao.valor).replace('.', ','));
      setData(lancamentoEmEdicao.data);
      setErro('');
      return;
    }

    limparFormulario();
  }, [lancamentoEmEdicao, mes, ano]);

  function limparFormulario() {
    setTipo('despesa');
    setDescricao('');
    setCategoria('Outros');
    setValor('');
    setData(dataPadraoPeriodo(mes, ano));
    setErro('');
  }

  function alterarTipo(novoTipo: TipoLancamento) {
    setTipo(novoTipo);
    if (novoTipo === 'receita' && categoria === 'Outros') {
      setCategoria('Salário');
    }
    if (novoTipo === 'despesa' && categoria === 'Salário') {
      setCategoria('Outros');
    }
  }

  async function salvar() {
    setErro('');
    const valorNumerico = Number(valor.replace(',', '.'));

    if (!descricao.trim()) {
      setErro('Informe uma descrição.');
      return;
    }
    if (!categoria) {
      setErro('Selecione uma categoria.');
      return;
    }
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setErro('Informe um valor maior que zero.');
      return;
    }
    const dataNormalizada = data.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNormalizada)) {
      setErro('Informe a data no formato AAAA-MM-DD.');
      return;
    }

    // Verifica também se o dia realmente existe (ex.: 31 de fevereiro não existe).
    const [anoData, mesData, diaData] = dataNormalizada.split('-').map(Number);
    const dataVerificada = new Date(Date.UTC(anoData, mesData - 1, diaData));
    const dataExiste =
      dataVerificada.getUTCFullYear() === anoData &&
      dataVerificada.getUTCMonth() + 1 === mesData &&
      dataVerificada.getUTCDate() === diaData;

    if (!dataExiste) {
      setErro('Informe uma data válida.');
      return;
    }

    // Impede gravar no mês atual por engano quando outro mês foi selecionado.
    // A edição mantém a data original e permite mover um lançamento de mês.
    if (!lancamentoEmEdicao && (mesData !== mes || anoData !== ano)) {
      setErro(
        `A data precisa estar no mês selecionado: ${String(mes).padStart(2, '0')}/${ano}.`
      );
      return;
    }

    await onSalvar({
      descricao: descricao.trim(),
      categoria,
      valor: valorNumerico,
      data: dataNormalizada,
      tipo,
    });

    if (!lancamentoEmEdicao) limparFormulario();
  }

  return (
    <View style={styles.card}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>{lancamentoEmEdicao ? 'Editar lançamento' : 'Novo lançamento'}</Text>
        <Text style={styles.subtitulo}>
          {lancamentoEmEdicao
            ? 'Atualize os dados e salve as alterações.'
            : 'Registre uma entrada ou saída de forma rápida.'}
        </Text>
      </View>

      <View style={styles.tipoContainer}>
        {(['receita', 'despesa'] as TipoLancamento[]).map((opcao) => {
          const ativo = tipo === opcao;
          return (
            <Pressable
              key={opcao}
              accessibilityRole="radio"
              accessibilityLabel={opcao === 'receita' ? 'Receita' : 'Despesa'}
              accessibilityState={{ checked: ativo }}
              style={[styles.tipoBotao, ativo && styles.tipoAtivo]}
              onPress={() => alterarTipo(opcao)}
            >
              <Text style={[styles.tipoTexto, ativo && styles.tipoTextoAtivo]}>
                {opcao === 'receita' ? 'Receita' : 'Despesa'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.campo}>
        <Text style={styles.rotulo}>Descrição</Text>
        <TextInput
          value={descricao}
          onChangeText={setDescricao}
          placeholder={tipo === 'receita' ? 'Ex.: Salário mensal' : 'Ex.: Supermercado'}
          style={styles.input}
          maxLength={120}
          accessibilityLabel="Descrição do lançamento"
          placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'}
        />
      </View>

      <View style={styles.campo}>
        <Text style={styles.rotulo}>Categoria</Text>
        <View style={styles.categorias}>
          {CATEGORIAS.map((opcao) => {
            const ativa = categoria === opcao;
            return (
              <Pressable
                key={opcao}
                accessibilityRole="radio"
                accessibilityLabel={`Categoria ${opcao}`}
                accessibilityState={{ checked: ativa }}
                style={[styles.categoria, ativa && styles.categoriaAtiva]}
                onPress={() => setCategoria(opcao)}
              >
                <Text style={[styles.categoriaTexto, ativa && styles.categoriaTextoAtiva]}>{opcao}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.linhaCampos}>
        <View style={[styles.campo, styles.campoFlex]}>
          <Text style={styles.rotulo}>Valor</Text>
          <TextInput
            value={valor}
            onChangeText={setValor}
            placeholder="Ex.: 250,00"
            keyboardType="decimal-pad"
            accessibilityLabel="Valor do lançamento em reais"
            placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'}
            style={styles.input}
          />
        </View>
        <View style={[styles.campo, styles.campoFlex]}>
          <Text style={styles.rotulo}>
            {lancamentoEmEdicao
              ? 'Data'
              : `Data (${String(mes).padStart(2, '0')}/${ano})`}
          </Text>
          <TextInput value={data} onChangeText={setData} placeholder="AAAA-MM-DD" accessibilityLabel="Data do lançamento, ano mês dia" accessibilityHint="Use o formato AAAA-MM-DD" placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} style={styles.input} />
        </View>
      </View>

      {erro ? <Text accessibilityLiveRegion="polite" style={styles.erro}>{erro}</Text> : null}

      <View style={styles.acoes}>
        {lancamentoEmEdicao ? (
          <AppButton
            title="Cancelar"
            variant="secondary"
            onPress={onCancelarEdicao}
            disabled={salvando}
            style={styles.botaoAcao}
          />
        ) : null}
        <AppButton
          title={salvando ? 'Salvando...' : lancamentoEmEdicao ? 'Salvar alterações' : 'Cadastrar lançamento'}
          onPress={salvar}
          disabled={salvando}
          style={styles.botaoAcao}
        />
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: '#ECE8F1', gap: 18 },
  cabecalho: { gap: 4 },
  titulo: { color: '#111827', fontSize: 21, fontWeight: '800' },
  subtitulo: { color: '#6B7280', fontSize: 13, lineHeight: 19 },
  tipoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tipoBotao: { flexGrow: 1, minWidth: 120, minHeight: 48, borderRadius: 14, backgroundColor: '#F4F1F8', borderWidth: 1, borderColor: '#E6E0EC', alignItems: 'center', justifyContent: 'center' },
  tipoAtivo: { backgroundColor: '#EDE9FE', borderColor: '#8B5CF6' },
  tipoTexto: { color: '#6B7280', fontWeight: '700', fontSize: 14 },
  tipoTextoAtivo: { color: '#5B21B6' },
  campo: { gap: 8 },
  rotulo: { fontSize: 13, color: '#4B5563', fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#DDD6E6', borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#FCFBFD', fontSize: 16, color: '#111827' },
  categorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoria: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: '#DDD6E6', backgroundColor: '#FFFFFF' },
  categoriaAtiva: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  categoriaTexto: { color: '#4B5563', fontSize: 13, fontWeight: '700' },
  categoriaTextoAtiva: { color: '#FFFFFF' },
  linhaCampos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  campoFlex: { flexGrow: 1, flexBasis: 220 },
  erro: { color: '#B91C1C', fontSize: 14 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  botaoAcao: { flexGrow: 1, flexBasis: 180 },
});
