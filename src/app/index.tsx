import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PeriodSelector } from '../components/finance/PeriodSelector';
import { SummaryCard } from '../components/finance/SummaryCard';
import { TransactionForm } from '../components/finance/TransactionForm';
import { TransactionItem } from '../components/finance/TransactionItem';
import {
  atualizarLancamento,
  buscarResumo,
  criarLancamento,
  excluirLancamento,
  listarLancamentos,
} from '../services/finance-api';
import { Lancamento, LancamentoInput, ResumoFinanceiro } from '../types/finance';

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function periodoAtual() {
  const agora = new Date();
  return { mes: agora.getMonth() + 1, ano: agora.getFullYear() };
}

export default function App() {
  const periodoInicial = periodoAtual();
  const [mes, setMes] = useState(periodoInicial.mes);
  const [ano, setAno] = useState(periodoInicial.ano);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregarDados = useCallback(
    async (modoRefresh = false) => {
      modoRefresh ? setAtualizando(true) : setCarregando(true);
      setErro('');

      try {
        const [lista, dadosResumo] = await Promise.all([
          listarLancamentos(mes, ano),
          buscarResumo(mes, ano),
        ]);
        setLancamentos(lista);
        setResumo(dadosResumo);
      } catch (error) {
        setErro(error instanceof Error ? error.message : 'Não foi possível carregar os dados.');
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [mes, ano]
  );

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  function mudarMes(delta: number) {
    setEditando(null);
    setMes((mesAtual) => {
      const novoMes = mesAtual + delta;
      if (novoMes === 0) {
        setAno((anoAtual) => anoAtual - 1);
        return 12;
      }
      if (novoMes === 13) {
        setAno((anoAtual) => anoAtual + 1);
        return 1;
      }
      return novoMes;
    });
  }

  async function salvarLancamento(input: LancamentoInput) {
    setSalvando(true);
    setErro('');

    try {
      if (editando) {
        await atualizarLancamento(editando.id, input);
        setEditando(null);
      } else {
        await criarLancamento(input);
      }
      await carregarDados();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar o lançamento.');
      throw error;
    } finally {
      setSalvando(false);
    }
  }

  async function removerLancamento(id: string) {
    setErro('');
    try {
      await excluirLancamento(id);
      if (editando?.id === id) setEditando(null);
      await carregarDados();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível excluir o lançamento.');
    }
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => carregarDados(true)} />}
    >
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>FinanMVP</Text>
        <Text style={styles.subtitulo}>Controle simples de receitas e despesas</Text>
      </View>

      <PeriodSelector
        mes={mes}
        ano={ano}
        onAnterior={() => mudarMes(-1)}
        onProximo={() => mudarMes(1)}
      />

      {erro ? (
        <View style={styles.erroCard}>
          <Text style={styles.erroTexto}>{erro}</Text>
          <Pressable style={styles.tentarNovamente} onPress={() => carregarDados()}>
            <Text style={styles.tentarNovamenteTexto}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}

      {carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator size="large" color="#166534" />
          <Text style={styles.carregandoTexto}>Carregando dados...</Text>
        </View>
      ) : (
        <>
          <View style={styles.resumoGrid}>
            <SummaryCard titulo="Saldo" valor={formatarMoeda(resumo?.saldo ?? 0)} />
            <SummaryCard titulo="Receitas" valor={formatarMoeda(resumo?.totalReceitas ?? 0)} destaque="positivo" />
            <SummaryCard titulo="Despesas" valor={formatarMoeda(resumo?.totalDespesas ?? 0)} destaque="negativo" />
          </View>

          <TransactionForm
            lancamentoEmEdicao={editando}
            salvando={salvando}
            onSalvar={salvarLancamento}
            onCancelarEdicao={() => setEditando(null)}
          />

          <View style={styles.secaoLista}>
            <View style={styles.listaCabecalho}>
              <Text style={styles.listaTitulo}>Lançamentos</Text>
              <Text style={styles.listaQuantidade}>{lancamentos.length}</Text>
            </View>

            {lancamentos.length === 0 ? (
              <View style={styles.vazio}>
                <Text style={styles.vazioTitulo}>Nenhum lançamento neste período</Text>
                <Text style={styles.vazioTexto}>Cadastre uma receita ou despesa usando o formulário acima.</Text>
              </View>
            ) : (
              <View style={styles.lista}>
                {lancamentos.map((lancamento) => (
                  <TransactionItem
                    key={lancamento.id}
                    lancamento={lancamento}
                    onEditar={setEditando}
                    onExcluir={removerLancamento}
                  />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  container: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 40,
    gap: 18,
  },
  cabecalho: {
    gap: 4,
  },
  titulo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#166534',
  },
  subtitulo: {
    fontSize: 15,
    color: '#6B7280',
  },
  resumoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  carregando: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  carregandoTexto: {
    color: '#6B7280',
  },
  erroCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  erroTexto: {
    color: '#991B1B',
  },
  tentarNovamente: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  tentarNovamenteTexto: {
    color: '#991B1B',
    fontWeight: '600',
  },
  secaoLista: {
    gap: 12,
  },
  listaCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listaTitulo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  listaQuantidade: {
    minWidth: 28,
    textAlign: 'center',
    color: '#166534',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
  },
  lista: {
    gap: 10,
  },
  vazio: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 6,
  },
  vazioTitulo: {
    fontWeight: '700',
    color: '#374151',
  },
  vazioTexto: {
    color: '#6B7280',
    textAlign: 'center',
  },
});
