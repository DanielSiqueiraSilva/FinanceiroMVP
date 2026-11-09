import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, View, useWindowDimensions,
} from 'react-native';
import type { Lancamento, LancamentoInput, ResumoFinanceiro } from '../../types/finance';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useNotifications } from '../../notifications/NotificationsContext';
import { ProfileCard } from '../auth/ProfileCard';
import { useProfileSession } from '../auth/ProtectedFinance';
import { AccountSettings } from '../auth/AccountSettings';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { MonthlyOverview } from '../finance/MonthlyOverview';
import { PaymentReminders } from '../finance/PaymentReminders';
import { PeriodSelector } from '../finance/PeriodSelector';
import { TransactionForm } from '../finance/TransactionForm';
import { TransactionItem } from '../finance/TransactionItem';
import { ExpensePieChart } from '../finance/ExpensePieChart';
import { SharedWallets } from '../shared/SharedWallets';
import {
  atualizarLancamento, buscarLimite, buscarResumo, criarLancamento,
  excluirLancamento, listarLancamentos, salvarLimite,
} from '../../services/finance-api';
import { ChartsArea, Metric, moeda, type MesAnalise } from './FinanceVisuals';
import { DataArea } from './DataArea';
import { FuturePlans } from './FuturePlans';
import { PlannerCenter } from './PlannerCenter';
import { BRAND, BrandMark, WorkspaceIcon, HeroSignature } from '../../design/brand';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { applyMonthlyRecurring, loadPlanner } from '../../services/finance-planner';
import type { FinanceAccount, FinanceCard, PlannerData } from '../../services/finance-planner';

type Aba = 'painel' | 'lancamentos' | 'graficos' | 'dados' | 'planos' | 'carteiras' | 'configuracoes' | 'automacao' | 'contas' | 'metas';
const PAGINAS: { id: Aba; titulo: string; simbolo: string; detalhe: string }[] = [
  { id: 'painel', titulo: 'Painel', simbolo: '⌂', detalhe: 'Seu ponto de partida' },
  { id: 'lancamentos', titulo: 'Lançamentos', simbolo: '+', detalhe: 'Receitas e despesas' },
  { id: 'graficos', titulo: 'Gráficos', simbolo: '▥', detalhe: 'Evolução financeira' },
  { id: 'dados', titulo: 'Dados', simbolo: '▤', detalhe: 'Filtros e exportação' },
  { id: 'automacao', titulo: 'Automação e calendário', simbolo: '▦', detalhe: 'Recorrências e vencimentos' },
  { id: 'contas', titulo: 'Contas e cartões', simbolo: '▣', detalhe: 'Organize suas contas' },
  { id: 'metas', titulo: 'Metas e orçamento', simbolo: '◎', detalhe: 'Objetivos e análises' },
  { id: 'planos', titulo: 'Planos Futuros', simbolo: '◎', detalhe: 'Simule suas metas' },
  { id: 'carteiras', titulo: 'Carteiras Compartilhadas', simbolo: '♧', detalhe: 'Finanças em conjunto' },
  { id: 'configuracoes', titulo: 'Configurações', simbolo: '⚙', detalhe: 'Sua conta e preferências' },
];
const hoje = () => { const data = new Date(); return { mes: data.getMonth() + 1, ano: data.getFullYear() }; };
const mesAno = (mes: number, ano: number) => String(mes).padStart(2, '0') + '/' + ano;

function NavButton({ pagina, ativa, onClick, compacto = false }: {
  pagina: typeof PAGINAS[number]; ativa: boolean; onClick: () => void; compacto?: boolean;
}) {
  const s = useAccessibleStyles(base);
  const { isDark } = useAccessibility();
  return (
    <Pressable onPress={onClick} accessibilityRole="button" accessibilityState={{ selected: ativa }}
      accessibilityLabel={'Abrir ' + pagina.titulo}
      style={[s.navButton, ativa && s.navActive, compacto && s.navCompact]}>
      <WorkspaceIcon name={pagina.id} size={compacto ? 22 : 19}
        color={ativa ? (compacto && isDark ? BRAND.lime : BRAND.ink) : compacto ? (isDark ? '#CBD5E1' : '#645777') : '#D9CDEE'}/>
      <Text numberOfLines={compacto ? 2 : 2}
        style={[s.navText, compacto && s.navTextMobile, ativa && s.navTextActive, compacto && ativa && isDark && s.navTextMobileDarkActive]}>{pagina.titulo}</Text>
    </Pressable>
  );
}

export function FinanceWorkspace() {
  const s = useAccessibleStyles(base);
  const notifications = useNotifications();
  const { isDark } = useAccessibility();
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
  const [historico, setHistorico] = useState<MesAnalise[]>([]);
  const [accountOptions,setAccountOptions] = useState<FinanceAccount[]>([]);
  const [cardOptions,setCardOptions] = useState<FinanceCard[]>([]);
  const [plannerSnapshot,setPlannerSnapshot] = useState<PlannerData | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState('');
  const [mostrarMais, setMostrarMais] = useState(false);
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
    setMostrarMais(false);
    setAba(id);
  };
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
  const maiores = useMemo(() => {
    const despesas = lista.filter(l => l.tipo === 'despesa');
    const maior = despesas.reduce<Lancamento | null>((r, v) => !r || v.valor > r.valor ? v : r, null);
    const porCategoria: Record<string, number> = {};
    despesas.forEach(l => { porCategoria[l.categoria] = (porCategoria[l.categoria] ?? 0) + l.valor; });
    const categoria = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0];
    return { maior, categoria };
  }, [lista]);
  const accountValue = plannerSnapshot?.accountOverview.reduce((a,b) => a + Number(b.estimated_balance),0);
  const cardPending = plannerSnapshot?.cardOverview.reduce((a,b) => a + Number(b.unpaid_total),0);
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
    if (aba === 'contas') return <PlannerCenter section="accounts" month={mes} year={ano} onUpdated={() => void carregar(true)} />;
    if (aba === 'metas') return <PlannerCenter section="goals" month={mes} year={ano} onUpdated={() => void carregar(true)} />;
    if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#7C3AED" /><Text style={s.muted}>Carregando seus dados...</Text></View>;
    if (aba === 'graficos') return histLoading ? <View style={s.loading}><ActivityIndicator color="#7C3AED" /><Text style={s.muted}>Carregando histórico...</Text></View> :
      histError ? <Text style={s.error}>{histError}</Text> : <ChartsArea meses={historico} lancamentos={lista} />;
    if (aba === 'dados') return <DataArea lancamentos={lista} periodo={mesAno(mes, ano)} />;
    if (aba === 'lancamentos') return (
      <View style={s.section}>
        <Text style={s.heading}>Lançamentos</Text>
        <Text style={s.muted}>Cadastre, edite e organize suas receitas e despesas em {mesAno(mes, ano)}. Vincule cada movimentação à conta ou cartão escolhido.</Text>
        {forecastNotice()}
        <TransactionForm key={mesAno(mes, ano) + '-' + (editando?.id || 'novo')} mes={mes} ano={ano}
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
      <View style={s.section}>
        <Text style={s.overline}>SEU DINHEIRO EM FOCO</Text>
        <Text style={s.heading}>Tudo começa com clareza.</Text>
        <Text style={s.muted}>Seu mês em um só lugar. Entenda os números e escolha seu próximo passo.</Text>
        <View style={s.heroRow}>
          <View style={s.heroCard} accessible accessibilityLabel={'Resultado do mês: ' + moeda(resumo?.saldo ?? 0)}>
            <View style={s.heroDecoration}><HeroSignature/></View>
            <View style={s.heroEyebrowRow}>
              <Text style={s.heroEyebrow}>VISÃO DO MÊS</Text>
              <Text style={s.heroStar}>✦</Text>
            </View>
            <Text style={s.heroLabel}>Resultado do mês</Text>
            <Text style={s.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
              {moeda(resumo?.saldo ?? 0)}
            </Text>
            <Text style={s.heroSub}>Receitas − despesas no período selecionado</Text>
            <Text style={s.heroFootnote}>O que importa é entender para onde seu dinheiro vai.</Text>
          </View>
          <View style={s.heroMetrics}>
            <Metric titulo="Receitas do mês" valor={moeda(resumo?.totalReceitas ?? 0)} />
            <Metric titulo="Despesas do mês" valor={moeda(resumo?.totalDespesas ?? 0)} />
          </View>
        </View>
        {plannerSnapshot && (plannerSnapshot.accounts.length > 0 || plannerSnapshot.cards.length > 0) && (
          <View style={s.metricRow}>
            {plannerSnapshot.accounts.length > 0 && <Metric
              titulo="Nas contas (estimativa)" valor={moeda(accountValue || 0)}
              detalhe="Saldo inicial + histórico vinculado + transferências − faturas pagas" />}
            {plannerSnapshot.cards.length > 0 && <Metric
              titulo="Cartões: compras pendentes" valor={moeda(cardPending || 0)}
              detalhe="Compras lançadas menos pagamentos registrados, não é a fatura oficial" />}
          </View>
        )}
        {forecastNotice()}
        <View style={s.sectionHeadingRow}>
          <View style={{ flex:1, minWidth: 0 }}>
            <Text style={s.overline}>EXPLORE SEU ESPAÇO</Text>
            <Text style={s.title}>O que vamos fazer hoje?</Text>
          </View>
        </View>
        <View style={s.quickGrid}>
          {PAGINAS.filter(p => ['lancamentos','contas','automacao','metas','graficos','planos'].includes(p.id)).map(p => (
            <Pressable key={p.id} onPress={() => irPara(p.id)} accessibilityRole="button"
              style={[s.quickCard, !desktop && s.quickCardMobile]}>
              <View style={s.quickIconBadge}>
                <WorkspaceIcon name={p.id} size={22} color={BRAND.ink}/>
              </View>
              <Text style={s.quickTitle}>{p.titulo}</Text>
              <Text style={s.muted}>{p.detalhe}</Text>
              <Text style={s.quickArrow}>Explorar  →</Text>
            </Pressable>
          ))}
        </View>
        <MonthlyOverview totalDespesas={resumo?.totalDespesas ?? 0} limite={limite} salvando={savingLimit} onSalvarLimite={atualizarLimite} />
        <PaymentReminders month={mes} year={ano} />
        <View style={s.metricRow}>
          <Metric titulo="Maior despesa" valor={maiores.maior ? moeda(maiores.maior.valor) : '—'} detalhe={maiores.maior?.descricao} />
          <Metric titulo="Categoria com maior gasto" valor={maiores.categoria ? maiores.categoria[0] : '—'} detalhe={maiores.categoria ? moeda(maiores.categoria[1]) : 'Sem despesas'} />
        </View>
        <ExpensePieChart lancamentos={lista} />
        <Pressable onPress={() => irPara('graficos')} style={s.link} accessibilityRole="button">
          <Text style={s.linkText}>Explorar gráficos e tendências →</Text>
        </Pressable>
      </View>
    );
  };

  const primarias = PAGINAS.filter(p => ['painel', 'lancamentos', 'graficos'].includes(p.id));
  const grupos = [
    { titulo: 'PRINCIPAL', ids: ['painel','lancamentos','graficos','dados'] },
    { titulo: 'ORGANIZAR', ids: ['contas','automacao','carteiras'] },
    { titulo: 'PLANEJAR', ids: ['metas','planos'] },
    { titulo: 'PREFERÊNCIAS', ids: ['configuracoes'] },
  ];
  return (
    <View style={s.root}>
      {desktop && (
        <View style={s.sidebar}>
          <View style={s.sidebarBrandRow}>
            <BrandMark size={40}/>
            <View style={{ flex: 1 }}>
              <Text style={s.brand}>financeiro.</Text>
              <Text style={s.sidebarHint}>SEU ESPAÇO FINANCEIRO</Text>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.sidebarSections}>
            {grupos.map(grupo => (
              <View key={grupo.titulo} style={s.sidebarGroup}>
                <Text style={s.groupLabel}>{grupo.titulo}</Text>
                {PAGINAS.filter(p => grupo.ids.includes(p.id)).map(p =>
                  <NavButton key={p.id} pagina={p} ativa={aba === p.id} onClick={() => irPara(p.id)} />)}
              </View>
            ))}
          </ScrollView>
          <View style={s.sidebarFooter}>
            <Text style={s.sidebarFooterTitle}>Menos complicação.</Text>
            <Text style={s.sidebarFooterText}>Mais clareza no seu dia.</Text>
          </View>
        </View>
      )}
      <View style={s.main}>
        <ScrollView style={s.scroll} contentContainerStyle={[s.content, { maxWidth: desktop ? 1180 : 740 }, !desktop && s.contentMobile]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void carregar(true)} />}>
          {desktop ? (
            <View style={s.header}>
              <View style={s.headerCopy}>
                <Text style={s.overline}>SEU DINHEIRO, COM MAIS CLAREZA</Text>
                <Text style={s.appName}>{page.titulo === 'Painel' ? 'Visão geral' : page.titulo}</Text>
              </View>
              <View style={s.headerActions}>
                <NotificationCenter />
                <ProfileCard onOpenSettings={() => irPara('configuracoes')} />
              </View>
            </View>
          ) : (
            <View style={s.mobileTopBar}>
              <View style={s.mobileBrandWrap}>
                <BrandMark size={36}/>
                <Text style={s.mobileBrand} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>financeiro.</Text>
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
          {mostrarFiltroPeriodo && <PeriodSelector mes={mes} ano={ano} onSelecionar={selecionarPeriodo} />}
          {erro ? <View style={s.notice}><Text style={s.error} accessibilityLiveRegion="assertive">{erro}</Text>
            <Pressable onPress={() => void carregar()} style={s.link}><Text style={s.linkText}>Tentar novamente</Text></Pressable></View> : null}
          {sucesso ? <Pressable onPress={() => setSucesso('')} style={s.success} accessibilityRole="button" accessibilityLabel="Fechar mensagem de sucesso">
            <Text style={s.successText}>{sucesso}  ×</Text></Pressable> : null}
          {conteudo()}
        </ScrollView>
        {!desktop && (
          <View style={s.bottom}>
            {primarias.map(p => <NavButton key={p.id} pagina={p} ativa={aba === p.id} onClick={() => irPara(p.id)} compacto />)}
            <Pressable onPress={() => setMostrarMais(v => !v)} accessibilityRole="button" accessibilityLabel="Abrir outras áreas"
              style={s.moreButton}><Text style={s.moreDots}>•••</Text><Text style={s.moreText}>Mais</Text></Pressable>
          </View>
        )}
        {!desktop && mostrarMais && (
          <View style={s.moreMenu}>
            <ScrollView style={{ maxHeight: 370 }} contentContainerStyle={{ gap: 5 }}>
              <Text style={s.groupLabel}>TODAS AS ÁREAS</Text>
              {PAGINAS.filter(p => !primarias.includes(p)).map(p =>
                <NavButton key={p.id} pagina={p} ativa={aba === p.id} onClick={() => irPara(p.id)} />)}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const base = StyleSheet.create({
  sidebarBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 4, marginBottom: 21 },
  sidebarSections: { gap: 15, paddingBottom: 18 },
  sidebarGroup: { gap: 5 },
  groupLabel: { color: '#C4B5D9', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, paddingHorizontal: 12, marginBottom: 6 },
  sidebarFooter: { padding: 15, borderRadius: 17, backgroundColor: '#3A2957', gap: 4, marginBottom: 16 },
  sidebarFooterTitle: { color: '#CBF28A', fontSize: 13, fontWeight: '900' },
  sidebarFooterText: { color: '#D9CDEE', fontSize: 12 },
  heroDecoration: { position: 'absolute', right: -12, top: 5, opacity: 0.72 },
  heroEyebrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroEyebrow: { color: '#CBF28A', letterSpacing: 1.1, fontWeight: '900', fontSize: 10 },
  heroStar: { color: '#CBF28A', fontSize: 22 },
  heroFootnote: { color: '#CBF28A', fontSize: 11, fontWeight: '700', marginTop: 12 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickIconBadge: { height: 43, width: 43, borderRadius: 14, backgroundColor: '#CBF28A', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  quickArrow: { color: '#6D28D9', fontSize: 12, fontWeight: '900', marginTop: 5 },
  moreDots: { color: '#111827', fontSize: 19, fontWeight: '900' },

  root: { flex: 1, flexDirection: 'row', backgroundColor: '#F7F5FA' },
  sidebar: { width: 244, backgroundColor: '#21143C', paddingTop: 25, paddingHorizontal: 14, gap: 6 },
  brand: { fontSize: 23, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.8 },
  sidebarHint: { color: '#D9CDEE', fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginTop: 3 },
  navList: { gap: 5 },
  navButton: { flexDirection: 'row', gap: 10, borderRadius: 12, paddingHorizontal: 14, minHeight: 47, alignItems: 'center' },
  navActive: { backgroundColor: '#CBF28A' },
  navIcon: { color: '#A78BFA', fontSize: 20, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  navIconActive: { color: '#6D28D9' },
  navText: { color: '#EAE5F5', fontSize: 13, fontWeight: '700', flexShrink: 1 },
  navTextActive: { color: '#21143C' },
  navTextMobile: { color: '#4B5563', fontSize: 10, textAlign: 'center', flexShrink: 1, lineHeight: 13 },
  navTextMobileDarkActive: { color: '#CBF28A' },
  navCompact: { flex: 1, flexDirection: 'column', gap: 1, paddingHorizontal: 1, minHeight: 56, justifyContent: 'center' },
  main: { flex: 1, minWidth: 0 },
  scroll: { flex: 1, minWidth: 0 },
  content: { width: '100%', alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 24, paddingBottom: 92, gap: 20 },
  contentMobile: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 28, gap: 14 },
  mobileTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, minHeight: 66, backgroundColor: '#21143C', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 },
  mobileBrandWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, gap: 7 },
  mobileLogo: { fontSize: 23, fontWeight: '900', color: '#C4B5FD' },
  mobileBrand: { flexShrink: 1, color: '#FFFFFF', fontSize: 21, fontWeight: '900', letterSpacing: -0.6 },
  mobileActions: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 },
  mobileAvatarButton: { width: 44, height: 44, borderRadius: 14, borderColor: '#CBF28A', borderWidth: 1.5, backgroundColor: '#42305F', justifyContent: 'center', alignItems: 'center' },
  mobileAvatarText: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  header: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  headerMobile: { flexWrap: 'nowrap', gap: 5 },
  headerCopy: { gap: 3, flexShrink: 1 },
  headerCopyMobile: { flex: 1, minWidth: 0 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  overline: { color: '#6D28D9', fontWeight: '900', fontSize: 10, letterSpacing: 1.5 },
  appName: { color: '#111827', fontWeight: '900', fontSize: 27, letterSpacing: -0.6 },
  appNameMobile: { fontSize: 20 },
  mobileHeading: { gap: 2 },
  section: { gap: 16 },
  forecastCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDD6E6', borderRadius: 18, padding: 15, gap: 10 },
  forecastItem: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ECE8F1', paddingTop: 9 },
  forecastDone: { color: '#15803D', fontWeight: '800', fontSize: 12 },
  forecastPending: { color: '#7C3AED', fontWeight: '800', fontSize: 12 },
  title: { color: '#111827', fontWeight: '900', fontSize: 19, letterSpacing: -0.3 },
  heading: { color: '#111827', fontWeight: '900', fontSize: 28, letterSpacing: -0.7 },
  muted: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  heroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  heroCard: { flexGrow: 1, flexBasis: 260, minWidth: 0, backgroundColor: '#21143C', borderRadius: 24, padding: 22, gap: 10, justifyContent: 'center', overflow: 'hidden', minHeight: 205 },
  heroLabel: { color: '#E7DCF9', fontSize: 13, fontWeight: '700' },
  heroValue: { color: '#FFFFFF', fontSize: 33, fontWeight: '900', letterSpacing: -0.6 },
  heroSub: { color: '#D9CDEE', fontSize: 11 },
  heroMetrics: { flexGrow: 2, flexBasis: 280, flexDirection: 'row', flexWrap: 'wrap', gap: 10, minWidth: 0 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { flexGrow: 1, flexBasis: 210, gap: 7, backgroundColor: '#FFFFFF', borderRadius: 21, borderColor: '#E6E0EC', borderWidth: 1, padding: 17, minHeight: 156 },
  quickCardMobile: { flexBasis: 138, minWidth: 0, padding: 13, minHeight: 148 },
  quickIcon: { fontSize: 24, fontWeight: '800', color: '#7C3AED' },
  quickTitle: { color: '#111827', fontSize: 15, fontWeight: '900' },
  list: { gap: 10 },
  link: { minHeight: 43, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12 },
  linkText: { color: '#6D28D9', fontWeight: '800', fontSize: 13 },
  loading: { gap: 12, paddingVertical: 50, alignItems: 'center' },
  notice: { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, gap: 7 },
  error: { color: '#B91C1C', fontSize: 13 },
  success: { backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14 },
  successText: { color: '#047857', fontWeight: '700', fontSize: 13 },
  bottom: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E6E0EC', paddingHorizontal: 6, paddingBottom: 9, paddingTop: 7, alignItems: 'center' },
  moreButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 56 },
  moreText: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  moreMenu: { position: 'absolute', bottom: 76, right: 8, width: 270, maxWidth: '90%', backgroundColor: '#21143C', borderRadius: 20, padding: 13, gap: 5, shadowColor: '#111827', shadowOpacity: .25, shadowRadius: 14, elevation: 9 },
});
