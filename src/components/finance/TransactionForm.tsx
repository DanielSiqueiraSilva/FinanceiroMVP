import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Lancamento, LancamentoInput, TipoLancamento } from '../../types/finance';
import { AppButton } from './AppButton';

const CATEGORIAS = [
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

function dataHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function dataValida(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [ano, mes, dia] = data.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

export function TransactionForm({
  lancamentoEmEdicao,
  salvando,
  onSalvar,
  onCancelarEdicao,
}: TransactionFormProps) {
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(dataHoje());
  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (lancamentoEmEdicao) {
      setDescricao(lancamentoEmEdicao.descricao);
      setCategoria(
        CATEGORIAS.includes(lancamentoEmEdicao.categoria as (typeof CATEGORIAS)[number])
          ? lancamentoEmEdicao.categoria
          : 'Outros'
      );
      setValor(String(lancamentoEmEdicao.valor).replace('.', ','));
      setData(lancamentoEmEdicao.data);
      setTipo(lancamentoEmEdicao.tipo);
      setErro('');
      return;
    }
    limparCampos();
  }, [lancamentoEmEdicao]);

  function limparCampos() {
    setDescricao('');
    setCategoria('');
    setValor('');
    setData(dataHoje());
    setTipo('despesa');
    setErro('');
  }

  async function salvar() {
    setErro('');
    if (!descricao.trim() || !categoria || !valor.trim() || !data.trim()) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }

    const valorNumerico = Number(valor.replace(',', '.'));
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setErro('Informe um valor numérico maior que zero.');
      return;
    }

    if (!dataValida(data)) {
      setErro('Informe uma data válida no formato AAAA-MM-DD.');
      return;
    }

    try {
      await onSalvar({
        descricao: descricao.trim(),
        categoria,
        valor: valorNumerico,
        data,
        tipo,
      });
      if (!lancamentoEmEdicao) limparCampos();
    } catch {
      // O componente pai exibe o erro retornado pela API.
    }
  }

  function cancelar() {
    limparCampos();
    onCancelarEdicao();
  }

  return (
    <View style={styles.card}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>{lancamentoEmEdicao ? 'Editar lançamento' : 'Novo lançamento'}</Text>
        <Text style={styles.subtitulo}>Preencha os dados abaixo para manter seu mês organizado.</Text>
      </View>

      <View style={styles.tipoContainer}>
        <Pressable
          style={[styles.tipoBotao, tipo === 'receita' && styles.tipoAtivo]}
          onPress={() => setTipo('receita')}
        >
          <Text style={[styles.tipoTexto, tipo === 'receita' && styles.tipoTextoAtivo]}>Receita</Text>
        </Pressable>
        <Pressable
          style={[styles.tipoBotao, tipo === 'despesa' && styles.tipoAtivo]}
          onPress={() => setTipo('despesa')}
        >
          <Text style={[styles.tipoTexto, tipo === 'despesa' && styles.tipoTextoAtivo]}>Despesa</Text>
        </Pressable>
      </View>

      <View style={styles.campo}>
        <Text style={styles.rotulo}>Descrição</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: Supermercado"
          value={descricao}
          onChangeText={setDescricao}
          maxLength={120}
        />
      </View>

      <View style={styles.campo}>
        <Text style={styles.rotulo}>Categoria</Text>
        <View style={styles.categorias}>
          {CATEGORIAS.map((item) => {
            const ativa = categoria === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => setCategoria(item)}
                style={[styles.categoria, ativa && styles.categoriaAtiva]}
              >
                <Text style={[styles.categoriaTexto, ativa && styles.categoriaTextoAtiva]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.linhaCampos}>
        <View style={[styles.campo, styles.campoFlex]}>
          <Text style={styles.rotulo}>Valor</Text>
          <TextInput
            style={styles.input}
            placeholder="0,00"
            value={valor}
            onChangeText={setValor}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={[styles.campo, styles.campoFlex]}>
          <Text style={styles.rotulo}>Data</Text>
          <TextInput
            style={styles.input}
            placeholder="AAAA-MM-DD"
            value={data}
            onChangeText={setData}
            autoCapitalize="none"
            maxLength={10}
          />
        </View>
      </View>

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <View style={styles.acoes}>
        {lancamentoEmEdicao ? (
          <AppButton title="Cancelar" variant="secondary" onPress={cancelar} disabled={salvando} style={styles.botaoAcao} />
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ECE8F1',
    gap: 18,
  },
  cabecalho: { gap: 4 },
  titulo: { color: '#111827', fontSize: 21, fontWeight: '800' },
  subtitulo: { color: '#6B7280', fontSize: 13, lineHeight: 19 },
  tipoContainer: { flexDirection: 'row', gap: 10 },
  tipoBotao: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#F4F1F8',
    borderWidth: 1,
    borderColor: '#E6E0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoAtivo: { backgroundColor: '#EDE9FE', borderColor: '#8B5CF6' },
  tipoTexto: { color: '#6B7280', fontWeight: '700' },
  tipoTextoAtivo: { color: '#5B21B6' },
  campo: { gap: 8 },
  rotulo: { fontSize: 13, color: '#4B5563', fontWeight: '700' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#DDD6E6',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FCFBFD',
    fontSize: 16,
    color: '#111827',
  },
  categorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoria: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDD6E6',
    backgroundColor: '#FFFFFF',
  },
  categoriaAtiva: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  categoriaTexto: { color: '#4B5563', fontSize: 13, fontWeight: '700' },
  categoriaTextoAtiva: { color: '#FFFFFF' },
  linhaCampos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  campoFlex: { flexGrow: 1, flexBasis: 220 },
  erro: { color: '#B91C1C', fontSize: 14 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  botaoAcao: { flexGrow: 1, flexBasis: 180 },
});
