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
import { ExpensePieChart } from '../components/finance/ExpensePieChart';
import { MonthlyOverview } from '../components/finance/MonthlyOverview';
import { PeriodSelector } from '../components/finance/PeriodSelector';
import { SummaryCard } from '../components/finance/SummaryCard';
import { TransactionForm } from '../components/finance/TransactionForm';
import { TransactionItem } from '../components/finance/TransactionItem';
import {
  atualizarLancamento,
  buscarLimite,
  buscarResumo,
  criarLancamento,
  excluirLancamento,
  listarLancamentos,
  salvarLimite,
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
  const [limite, setLimite] = useState(0);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoLimite, setSalvandoLimite] = useState(false);
  const [erro, setErro] = useState('');

  const carregarDados = useCallback(
    async (modoRefresh = false) => {
      modoRefresh ? setAtualizando(true) : setCarregando(true);
      setErro('');

      try {
        const [lista, dadosResumo, dadosLimite] = await Promise.all([
          listarLancamentos(mes, ano),
          buscarResumo(mes, ano),
          buscarLimite(mes, ano),
        ]);
        setLancamentos(lista);
        setResumo(dadosResumo);
        setLimite(dadosLimite.valor ?? 0);
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

  async function atualizarLimiteMensal(valor: number) {
    setSalvandoLimite(true);
    setErro('');
    try {
      const resultado = await salvarLimite(mes, ano, valor);
      setLimite(resultado.valor);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar o limite mensal.');
      throw error;
    } finally {
      setSalvandoLimite(false);
    }
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => carregarDados(true)} />}
    >
      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.saudacao}>Seu controle financeiro</Text>
          <Text style={styles.titulo}>FinanMVP</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarTexto}>F</Text></View>
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
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.carregandoTexto}>Carregando dados...</Text>
        </View>
      ) : (
        <>
          <MonthlyOverview
            totalDespesas={resumo?.totalDespesas ?? 0}
            limite={limite}
            salvando={salvandoLimite}
            onSalvarLimite={atualizarLimiteMensal}
          />

          <View style={styles.resumoGrid}>
            <SummaryCard titulo="Saldo" valor={formatarMoeda(resumo?.saldo ?? 0)} />
            <SummaryCard titulo="Entradas" valor={formatarMoeda(resumo?.totalReceitas ?? 0)} destaque="positivo" />
            <SummaryCard titulo="Saídas" valor={formatarMoeda(resumo?.totalDespesas ?? 0)} destaque="negativo" />
          </View>

          <ExpensePieChart lancamentos={lancamentos} />

          <TransactionForm
            lancamentoEmEdicao={editando}
            salvando={salvando}
            onSalvar={salvarLancamento}
            onCancelarEdicao={() => setEditando(null)}
          />

          <View style={styles.secaoLista}>
            <View style={styles.listaCabecalho}>
              <View>
                <Text style={styles.listaTitulo}>Lançamentos</Text>
                <Text style={styles.listaSubtitulo}>Receitas e despesas do período</Text>
              </View>
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
  tela: { flex: 1, backgroundColor: '#F7F5FA' },
  container: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 38,
    paddingBottom: 48,
    gap: 18,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saudacao: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  titulo: { fontSize: 30, fontWeight: '900', color: '#111827', marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 99, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 },
  resumoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  carregando: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  carregandoTexto: { color: '#6B7280' },
  erroCard: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  erroTexto: { color: '#991B1B' },
  tentarNovamente: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#FFFFFF' },
  tentarNovamenteTexto: { color: '#991B1B', fontWeight: '700' },
  secaoLista: { gap: 12 },
  listaCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listaTitulo: { fontSize: 21, fontWeight: '800', color: '#111827' },
  listaSubtitulo: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  listaQuantidade: { minWidth: 30, textAlign: 'center', color: '#6D28D9', backgroundColor: '#EDE9FE', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, fontWeight: '800' },
  lista: { gap: 10 },
  vazio: { padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', alignItems: 'center', gap: 6 },
  vazioTitulo: { fontWeight: '700', color: '#374151' },
  vazioTexto: { color: '#6B7280', textAlign: 'center' },
});
