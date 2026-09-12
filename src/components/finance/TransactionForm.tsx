import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Lancamento, LancamentoInput, TipoLancamento } from '../../types/finance';

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
      setCategoria(lancamentoEmEdicao.categoria);
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

    if (!descricao.trim() || !categoria.trim() || !valor.trim() || !data.trim()) {
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
        categoria: categoria.trim(),
        valor: valorNumerico,
        data,
        tipo,
      });

      if (!lancamentoEmEdicao) {
        limparCampos();
      }
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
      <Text style={styles.titulo}>{lancamentoEmEdicao ? 'Editar lançamento' : 'Novo lançamento'}</Text>

      <View style={styles.tipoContainer}>
        <Pressable
          style={[styles.tipoBotao, tipo === 'receita' && styles.tipoAtivoReceita]}
          onPress={() => setTipo('receita')}
        >
          <Text style={[styles.tipoTexto, tipo === 'receita' && styles.tipoTextoAtivo]}>Receita</Text>
        </Pressable>
        <Pressable
          style={[styles.tipoBotao, tipo === 'despesa' && styles.tipoAtivoDespesa]}
          onPress={() => setTipo('despesa')}
        >
          <Text style={[styles.tipoTexto, tipo === 'despesa' && styles.tipoTextoAtivo]}>Despesa</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        maxLength={120}
      />
      <TextInput
        style={styles.input}
        placeholder="Categoria (ex.: Alimentação)"
        value={categoria}
        onChangeText={setCategoria}
        maxLength={60}
      />
      <TextInput
        style={styles.input}
        placeholder="Valor"
        value={valor}
        onChangeText={setValor}
        keyboardType="decimal-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="AAAA-MM-DD"
        value={data}
        onChangeText={setData}
        autoCapitalize="none"
        maxLength={10}
      />

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <Pressable style={[styles.salvar, salvando && styles.desabilitado]} onPress={salvar} disabled={salvando}>
        <Text style={styles.salvarTexto}>{salvando ? 'Salvando...' : lancamentoEmEdicao ? 'Salvar alterações' : 'Cadastrar'}</Text>
      </Pressable>

      {lancamentoEmEdicao ? (
        <Pressable style={styles.cancelar} onPress={cancelar} disabled={salvando}>
          <Text style={styles.cancelarTexto}>Cancelar edição</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  titulo: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  tipoContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tipoBotao: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  tipoAtivoReceita: {
    backgroundColor: '#DCFCE7',
  },
  tipoAtivoDespesa: {
    backgroundColor: '#FEE2E2',
  },
  tipoTexto: {
    color: '#4B5563',
    fontWeight: '600',
  },
  tipoTextoAtivo: {
    color: '#111827',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#111827',
  },
  erro: {
    color: '#B91C1C',
    fontSize: 14,
  },
  salvar: {
    backgroundColor: '#166534',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  salvarTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelar: {
    paddingVertical: 11,
    alignItems: 'center',
  },
  cancelarTexto: {
    color: '#4B5563',
    fontWeight: '600',
  },
  desabilitado: {
    opacity: 0.6,
  },
});
