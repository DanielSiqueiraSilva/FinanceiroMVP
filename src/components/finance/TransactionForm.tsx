import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Lancamento, LancamentoInput, TipoLancamento } from '../../types/finance';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
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
  lancamentoEmEdicao: Lancamento | null;
  salvando: boolean;
  onSalvar: (input: LancamentoInput) => Promise<void>;
  onCancelarEdicao: () => void;
};

function dataAtual() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({
  lancamentoEmEdicao,
  salvando,
  onSalvar,
  onCancelarEdicao,
}: TransactionFormProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<string>('Outros');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(dataAtual());
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
  }, [lancamentoEmEdicao]);

  function limparFormulario() {
    setTipo('despesa');
    setDescricao('');
    setCategoria('Outros');
    setValor('');
    setData(dataAtual());
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      setErro('Informe a data no formato AAAA-MM-DD.');
      return;
    }

    await onSalvar({
      descricao: descricao.trim(),
      categoria,
      valor: valorNumerico,
      data,
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
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          maxLength={120}
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
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
        <View style={[styles.campo, styles.campoFlex]}>
          <Text style={styles.rotulo}>Data</Text>
          <TextInput
            value={data}
            onChangeText={setData}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />
        </View>
      </View>

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 18 },
    cabecalho: { gap: 4 },
    titulo: { color: colors.textPrimary, fontSize: 21, fontWeight: '800' },
    subtitulo: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
    tipoContainer: { flexDirection: 'row', gap: 10 },
    tipoBotao: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    tipoAtivo: { backgroundColor: colors.accentSoftBg, borderColor: colors.accent },
    tipoTexto: { color: colors.textSecondary, fontWeight: '700' },
    tipoTextoAtivo: { color: colors.accentSoftText },
    campo: { gap: 8 },
    rotulo: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
    input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.inputBg, fontSize: 16, color: colors.textPrimary },
    categorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoria: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    categoriaAtiva: { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong },
    categoriaTexto: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
    categoriaTextoAtiva: { color: colors.onAccent },
    linhaCampos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    campoFlex: { flexGrow: 1, flexBasis: 220 },
    erro: { color: colors.negative, fontSize: 14 },
    acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    botaoAcao: { flexGrow: 1, flexBasis: 180 },
  });
}
