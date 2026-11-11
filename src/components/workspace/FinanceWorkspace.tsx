import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, View, useWindowDimensions, Platform,
} from 'react-native';
import type { Lancamento, LancamentoInput, ResumoFinanceiro } from '../../types/finance';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { useNotifications } from '../../notifications/NotificationsContext';
import { ProfileCard } from '../auth/ProfileCard';
import { useProfileSession } from '../auth/ProtectedFinance';
import { AccountSettings } from '../auth/AccountSettings';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { PeriodSelector } from '../finance/PeriodSelector';
import { TransactionForm } from '../finance/TransactionForm';
import { TransactionItem } from '../finance/TransactionItem';
import { SharedWallets } from '../shared/SharedWallets';
import {
  atualizarLancamento, buscarLimite, buscarResumo, criarLancamento,
  excluirLancamento, listarLancamentos, salvarLimite,
} from '../../services/finance-api';
import { ChartsArea, moeda, type MesAnalise } from './FinanceVisuals';
import { DataArea } from './DataArea';
import { FuturePlans } from './FuturePlans';
import { PlannerCenter } from './PlannerCenter';
import { BrandMark } from '../../design/brand';
import { OceanPrototypeDashboard } from '../dashboard/OceanPrototypeDashboard';
import { OceanBottomNavigation, OceanSidebar, type QuickAction } from '../navigation/OceanNavigation';
import { OCEAFIN, getOceafinTheme } from '../../design/tokens';
import { applyMonthlyRecurring, loadPlanner } from '../../services/finance-planner';
import type { FinanceAccount, FinanceCard, PlannerData } from '../../services/finance-planner';

type Aba = 'cartoes' | 'painel' | 'lancamentos' | 'graficos' | 'dados' | 'planos' | 'carteiras' | 'configuracoes' | 'automacao' | 'contas' | 'metas';
const PAGINAS: { id: Aba; titulo: string; simbolo: string; detalhe: string }[] = [
  { id: 'painel', titulo: 'Início', simbolo: '⌂', detalhe: 'Seu ponto de partida' },
  { id: 'lancamentos', titulo: 'Lançamentos', simbolo: '+', detalhe: 'Receitas e despesas' },
  { id: 'graficos', titulo: 'Análises', simbolo: '▥', detalhe: 'Evolução financeira' },
  { id: 'dados', titulo: 'Dados', simbolo: '▤', detalhe: 'Filtros e exportação' },
  { id: 'automacao', titulo: 'Automações', simbolo: '▦', detalhe: 'Recorrências e vencimentos' },
  { id: 'contas', titulo: 'Contas', simbolo: '▣', detalhe: 'Saldos e transferências' },
  { id: 'cartoes', titulo: 'Cartões', simbolo: '▥', detalhe: 'Compras e pagamentos' },
  { id: 'metas', titulo: 'Planejamento', simbolo: '◎', detalhe: 'Objetivos e análises' },
  { id: 'planos', titulo: 'Planos Futuros', simbolo: '◎', detalhe: 'Simule suas metas' },
  { id: 'carteiras', titulo: 'Carteiras Compartilhadas', simbolo: '♧', detalhe: 'Finanças em conjunto' },
  { id: 'configuracoes', titulo: 'Configurações', simbolo: '⚙', detalhe: 'Sua conta e preferências' },
];
const hoje = () => { const data = new Date(); return { mes: data.getMonth() + 1, ano: data.getFullYear() }; };
const mesAno = (mes: number, ano: number) => String(mes).padStart(2, '0') + '/' + ano;

export function FinanceWorkspace() {
  const s = useAccessibleStyles(base);
  const { isDark } = useAccessibility();
  const theme = getOceafinTheme(isDark);
  const notifications = useNotifications();
  const account = useProfileSession();
  const accountName = account?.session.user.user_metadata?.full_name;
  const displayName = typeof accountName === 'string' && accountName.trim() ? accountName.trim() : (account?.session.user.email?.split('@')[0] || 'Usuário');
  const initialLetter = Array.from(displayName)[0]?.toLocaleUpperCase('pt-BR') || 'U';
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const initial = useMemo(hoje, []);
  const [aba, setAba] = useState<Aba>('painel');
  const [mes, setMes] = useState(initial.mes);
  const [ano, setAno] = useState(initial.ano);
  const [lista, setLista] = useState<Lancamento[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [limite, setLimite] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [quickIntent, setQuickIntent] = useState<'receita' | 'despesa' | null>(null);
  const [quickTransfer, setQuickTransfer] = useState(false);
  const [historico, setHistorico] = useState<MesAnalise[]>([]);
  const [accountOptions,setAccountOptions] = useState<FinanceAccount[]>([]);
  const [cardOptions,setCardOptions] = useState<FinanceCard[]>([]);
  const [plannerSnapshot,setPlannerSnapshot] = useState<PlannerData | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState('');
  const seq = useRef(0);
  const histSeq = useRef(0);
  const recurringRun = useRef<string>('');
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; seq.current++; histSeq.current++; }, []);

  const carregar = useCallback(async (refresh = false) => {
    const id = ++seq.current;
    refresh ? setRefreshing(true) : setLoading(true);
    setErro('');
    try {
      const [dados, total, teto] = await Promise.all([
        listarLancamentos(mes, ano),
        buscarResumo(mes, ano),
        buscarLimite(mes, ano),
      ]);
      if (!mounted.current || id !== seq.current) return;
      setLista(dados); setResumo(total); setLimite(teto.valor ?? 0);
    } catch (e) {
      if (mounted.current && id === seq.current) setErro(e instanceof Error ? e.message : 'Erro ao carregar as finanças.');
    } finally {
      if (mounted.current && id === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [mes, ano]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    if (aba !== 'lancamentos' && aba !== 'painel') return;
    let active = true;
    setPlannerSnapshot(null);
    void loadPlanner(mes,ano).then(p => {
      if (active) { setAccountOptions(p.accounts); setCardOptions(p.cards); setPlannerSnapshot(p); }
    }).catch(() => {
      if (active) { setAccountOptions([]); setCardOptions([]); setPlannerSnapshot(null); }
    });
    return () => { active = false; };
  },[aba,mes,ano]);
  useEffect(() => {
    // Regras são registradas como lançamentos comuns, nunca débitos bancários.
    // Processamento limitado ao mês atual, uma tentativa por sessão e mês.
    const now = new Date();
    if (mes !== now.getMonth() + 1 || ano !== now.getFullYear()) return;
    const key = ano + '-' + mes;
    if (recurringRun.current === key) return;
    recurringRun.current = key;
    let active = true;
    void applyMonthlyRecurring(mes, ano).then(created => {
      if (active && created > 0) void carregar(true);
    }).catch(() => {
      // O painel continua utilizável se o recurso ainda não estiver implantado.
      // A tela de automação exibe erros explícitos quando aberta.
    });
    return () => { active = false; };
  }, [mes, ano, carregar]);

  useEffect(() => {
    if (aba !== 'graficos') return;
    const id = ++histSeq.current;
    setHistLoading(true); setHistError('');
    const periodos = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(ano, mes - 1 - (5 - i), 1);
      return { mes: date.getMonth() + 1, ano: date.getFullYear() };
    });
    void Promise.all(periodos.map(async p => ({
      ...p, resumo: await buscarResumo(p.mes, p.ano),
    }))).then(items => {
      if (mounted.current && id === histSeq.current) setHistorico(items);
    }).catch(e => {
      if (mounted.current && id === histSeq.current) {
        setHistorico([]);
        setHistError(e instanceof Error ? e.message : 'Não foi possível carregar o histórico.');
      }
    }).finally(() => {
      if (mounted.current && id === histSeq.current) setHistLoading(false);
    });
    return () => { histSeq.current++; };
  }, [aba, mes, ano]);

  const irPara = (id: Aba) => {
    if (['painel','lancamentos','graficos','dados'].includes(id)) void carregar(true);
    notifications?.click();
    setAba(id);
  };
  function acaoRapida(action: QuickAction) {
    setEditando(null);
    if (action === 'transferencia') {
      setQuickTransfer(true);
      irPara('contas');
      return;
    }
    // A card purchase is an expense linked to a card, NOT a payment.
    // It must start in the transaction form so card choices remain available.
    setQuickTransfer(false);
    setQuickIntent(action === 'receita' ? 'receita' : 'despesa');
    irPara('lancamentos');
  }

  function selecionarPeriodo(mesNovo: number, anoNovo: number) {
    if (mesNovo === mes && anoNovo === ano) return;
    setMes(mesNovo);
    setAno(anoNovo);
    setEditando(null);
    setSucesso('');
  }
  async function salvar(input: LancamentoInput) {
    setSaving(true); setErro('');
    try {
      if (editando) await atualizarLancamento(editando.id, input);
      else await criarLancamento(input);
      setEditando(null);
      await carregar();
      setSucesso('Lançamento salvo com sucesso.');
      notifications?.feedback('success', 'Operação concluída', 'Lançamento salvo.');
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Falha ao salvar lançamento.';
      setErro(text); notifications?.feedback('warning', 'Erro', text);
      throw e;
    } finally { setSaving(false); }
  }
  async function remover(id: string) {
    setErro('');
    try {
      await excluirLancamento(id);
      if (editando?.id === id) setEditando(null);
      await carregar();
      setSucesso('Lançamento excluído.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir.');
    }
  }
  async function atualizarLimite(valor: number) {
    setSavingLimit(true); setErro('');
    try {
      const result = await salvarLimite(mes, ano, valor);
      setLimite(result.valor);
      setSucesso('Limite atualizado.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar limite.');
      throw e;
    } finally { setSavingLimit(false); }
  }
  const forecasts = useMemo(() => plannerSnapshot?.rules.filter(r => r.active &&
    r.start_month <= String(ano)+'-'+String(mes).padStart(2,'0')+'-01' &&
    (!r.end_month || r.end_month >= String(ano)+'-'+String(mes).padStart(2,'0')+'-01')
  ).map(rule => ({
    rule, posted: plannerSnapshot.posts.some(p => p.rule_id === rule.id)
  })) || [],[plannerSnapshot,mes,ano]);
  const page = PAGINAS.find(p => p.id === aba) || PAGINAS[0];
  const mostrarFiltroPeriodo = !['planos', 'carteiras', 'configuracoes'].includes(aba);

  const forecastNotice = () => !forecasts.length ? null : (
    <View style={s.forecastCard}>
      <Text style={s.title}>Recorrências deste mês</Text>
      <Text style={s.muted}>Previstas não entram no saldo ou gráficos até serem registradas. Quando uma regra é contabilizada, ela aparece em Lançamentos uma única vez.</Text>
      {forecasts.slice(0,5).map(({rule,posted}) => (
        <View key={rule.id} style={s.forecastItem}>
          <View style={{ flex:1, minWidth:0 }}>
            <Text style={s.quickTitle}>{rule.description} · {moeda(Number(rule.amount))}</Text>
            <Text style={s.muted}>Dia {rule.day_of_month} · {rule.kind === 'receita' ? 'Receita' : 'Despesa'}</Text>
          </View>
          <Text style={posted ? s.forecastDone : s.forecastPending}>{posted ? 'Registrado' : 'Previsto'}</Text>
        </View>
      ))}
      <Pressable accessibilityRole="button" onPress={() => irPara('automacao')} style={s.link}>
        <Text style={s.linkText}>Abrir calendário e registrar recorrências →</Text>
      </Pressable>
    </View>
  );
  const conteudo = () => {
    if (aba === 'configuracoes') return <AccountSettings onBack={() => irPara('painel')} />;
    if (aba === 'carteiras') return <SharedWallets />;
    if (aba === 'planos') return <FuturePlans />;
    if (aba === 'automacao') return <PlannerCenter section="automation" month={mes} year={ano} onUpdated={() => void carregar(true)} />;
    if (aba === 'contas' || aba === 'cartoes') return <PlannerCenter section="accounts" month={mes} year={ano}
      initialType={aba === 'cartoes' ? 'cards' : 'accounts'}
      initialOperation={quickTransfer && aba === 'contas' ? 'transfer' : null}
      onUpdated={() => void carregar(true)} />;
    if (aba === 'metas') return <PlannerCenter section="goals" month={mes} year={ano} onUpdated={() => void carregar(true)} />;
    if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#00CDD0" /><Text style={s.muted}>Carregando seus dados...</Text></View>;
    if (aba === 'graficos') return histLoading ? <View style={s.loading}><ActivityIndicator color="#00CDD0" /><Text style={s.muted}>Carregando histórico...</Text></View> :
      histError ? <Text style={s.error}>{histError}</Text> : <ChartsArea meses={historico} lancamentos={lista} />;
    if (aba === 'dados') return <DataArea lancamentos={lista} periodo={mesAno(mes, ano)} />;
    if (aba === 'lancamentos') return (
      <View style={s.section}>
        <Text style={s.heading}>Lançamentos</Text>
        <Text style={s.muted}>Cadastre, edite e organize suas receitas e despesas em {mesAno(mes, ano)}. Vincule cada movimentação à conta ou cartão escolhido.</Text>
        {forecastNotice()}
        <TransactionForm key={mesAno(mes, ano) + '-' + (editando?.id || 'novo') + '-' + (quickIntent || '')}
          initialType={quickIntent || undefined} mes={mes} ano={ano}
          lancamentoEmEdicao={editando} salvando={saving} onSalvar={salvar}
          accounts={accountOptions} cards={cardOptions}
          onCancelarEdicao={() => setEditando(null)} />
        <Text style={s.title}>Movimentações do mês ({lista.length})</Text>
        {!lista.length ? <Text style={s.muted}>Ainda não há lançamentos nesse mês.</Text> : (
          <View style={s.list}>{[...lista].sort((a, b) => b.data.localeCompare(a.data)).map(l => (
            <TransactionItem key={l.id} lancamento={l} onEditar={setEditando} onExcluir={remover} />
          ))}</View>
        )}
      </View>
    );
    return (
      <OceanPrototypeDashboard
        resumo={resumo}
        lancamentos={lista}
        planner={plannerSnapshot}
        forecasts={forecasts}
        mes={mes} ano={ano}
        limite={limite}
        salvandoLimite={savingLimit}
        onSalvarLimite={atualizarLimite}
        onNavigate={irPara}
      />
    );
  };

  const grupos = [
    { titulo: 'VISÃO GERAL', ids: ['painel','lancamentos','contas','cartoes'] },
    { titulo: 'ORGANIZAÇÃO', ids: ['automacao','metas','graficos'] },
    { titulo: 'PREFERÊNCIAS', ids: ['configuracoes'] },
    { titulo: 'OUTRAS ÁREAS', ids: ['planos','dados','carteiras'] },
  ];
  return (
    <View style={[s.root, {
      backgroundColor: isDark ? '#03182B' : '#E5F5FA',
      borderColor: isDark ? '#347E98' : '#A5CFDE',
    }]}>
      {desktop && <OceanSidebar pages={PAGINAS} groups={grupos}
        active={aba} onNavigate={irPara} />}
      <View style={s.main}>
        <ScrollView style={s.scroll} contentContainerStyle={[s.content, { maxWidth: desktop ? 1350 : 740 }, !desktop && s.contentMobile]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void carregar(true)} />}>
          {desktop ? (
            <View style={s.header}>
              <View style={s.headerCopy}>
                <Text style={[s.overline, { color: isDark ? '#64F5E9' : '#0077C8' }]}>
                  OCEAFIN / {String(mes).padStart(2,'0')}.{ano}
                </Text>
                <Text style={[s.appName,{ color: theme.text }]}>
                  {aba === 'painel' ? 'Visão geral' : page.titulo}
                </Text>
                <Text style={[s.muted, { color: theme.muted }]}>
                  Suas finanças em equilíbrio, com tudo em um só lugar.
                </Text>
              </View>
              <View style={s.headerActions}>
                {mostrarFiltroPeriodo &&
                  <PeriodSelector mes={mes} ano={ano} onSelecionar={selecionarPeriodo} />}
                <NotificationCenter />
                <ProfileCard onOpenSettings={() => irPara('configuracoes')} />
              </View>
            </View>
          ) : (
            <View style={s.mobileTopBar}>
              <View style={s.mobileBrandWrap}>
                <BrandMark size={36}/>
                <Text style={s.mobileBrand} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{OCEAFIN.name.toLowerCase()}</Text>
              </View>
              <View style={s.mobileActions}>
                <NotificationCenter />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={'Abrir configurações de ' + displayName}
                  onPress={() => irPara('configuracoes')}
                  style={s.mobileAvatarButton}
                >
                  <Text style={s.mobileAvatarText}>{initialLetter}</Text>
                </Pressable>
              </View>
            </View>
          )}
          {!desktop && (
            <View style={s.mobileHeading}>
              <Text style={s.title}>{page.titulo}</Text>
              <Text style={s.muted}>{page.detalhe}</Text>
            </View>
          )}
          {!desktop && mostrarFiltroPeriodo && <PeriodSelector mes={mes} ano={ano} onSelecionar={selecionarPeriodo} />}
          {erro ? <View style={s.notice}><Text style={s.error} accessibilityLiveRegion="assertive">{erro}</Text>
            <Pressable onPress={() => void carregar()} style={s.link}><Text style={s.linkText}>Tentar novamente</Text></Pressable></View> : null}
          {sucesso ? <Pressable onPress={() => setSucesso('')} style={s.success} accessibilityRole="button" accessibilityLabel="Fechar mensagem de sucesso">
            <Text style={s.successText}>{sucesso}  ×</Text></Pressable> : null}
          {conteudo()}
        </ScrollView>
        {!desktop && <OceanBottomNavigation pages={PAGINAS}
          active={aba} onNavigate={irPara} onQuickAction={acaoRapida} />}
      </View>
    </View>
  );
}

const base = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#07182C',
    borderWidth: 1, borderRadius: 23, overflow: 'hidden' },
  main: { flex: 1, minWidth: 0 },
  scroll: { flex: 1, minWidth: 0 },
  content: { width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 23,
    paddingBottom: 110, gap: 20 },
  contentMobile: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 135, gap: 18 },
  mobileTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: 8, minHeight: 66, backgroundColor: '#0B1F4B', borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 9 },
  mobileBrandWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, gap: 7 },
  mobileBrand: { flexShrink: 1, color: '#FFFFFF', fontSize: 21,
    fontWeight: '900', letterSpacing: -0.6 },
  mobileActions: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 },
  mobileAvatarButton: { width: 44, height: 44, borderRadius: 14, borderColor: '#89FAF0',
    borderWidth: 1, backgroundColor: '#0B5470', justifyContent: 'center', alignItems: 'center' },
  mobileAvatarText: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  header: { flexDirection: 'row', gap: 10, justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap' },
  headerCopy: { gap: 3, flexShrink: 1 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  overline: { color: '#6D28D9', fontWeight: '900', fontSize: 10, letterSpacing: 1.5 },
  appName: { color: '#111827', fontWeight: '900', fontSize: 27, letterSpacing: -0.6 },
  mobileHeading: { gap: 2 },
  section: { gap: 16 },
  forecastCard: { backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#DDD6E6', borderRadius: 18, padding: 15, gap: 10 },
  forecastItem: { flexDirection: 'row', gap: 8, justifyContent: 'space-between',
    alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ECE8F1', paddingTop: 9 },
  forecastDone: { color: '#15803D', fontWeight: '800', fontSize: 12 },
  forecastPending: { color: '#7C3AED', fontWeight: '800', fontSize: 12 },
  title: { color: '#111827', fontWeight: '900', fontSize: 19, letterSpacing: -0.3 },
  heading: { color: '#111827', fontWeight: '900', fontSize: 28, letterSpacing: -0.7 },
  muted: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  quickTitle: { color: '#111827', fontSize: 15, fontWeight: '900' },
  list: { gap: 10 },
  link: { minHeight: 43, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12 },
  linkText: { color: '#6D28D9', fontWeight: '800', fontSize: 13 },
  loading: { gap: 12, paddingVertical: 50, alignItems: 'center' },
  notice: { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, gap: 7 },
  error: { color: '#B91C1C', fontSize: 13 },
  success: { backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14 },
  successText: { color: '#047857', fontWeight: '700', fontSize: 13 },
});
