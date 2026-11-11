import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAccessibility } from '../accessibility/AccessibilityContext';
import { OceanSidebar, OceanBottomNavigation, type OceanPage, type QuickAction }
  from '../components/navigation/OceanNavigation';
import { OceanPrototypeDashboard } from '../components/dashboard/OceanPrototypeDashboard';
import { PeriodSelector } from '../components/finance/PeriodSelector';
import { getOceafinTheme } from '../design/tokens';
import type { Lancamento, ResumoFinanceiro } from '../types/finance';
import type { PlannerData } from '../services/finance-planner';

const pages: OceanPage[] = [
  { id: 'painel', titulo: 'Início', detalhe: 'Seu ponto de partida' },
  { id: 'lancamentos', titulo: 'Lançamentos', detalhe: 'Receitas e despesas' },
  { id: 'contas', titulo: 'Contas', detalhe: 'Seu dinheiro' },
  { id: 'cartoes', titulo: 'Cartões', detalhe: 'Compras no cartão' },
  { id: 'automacao', titulo: 'Automações', detalhe: 'Recorrências' },
  { id: 'metas', titulo: 'Planejamento', detalhe: 'Metas e orçamento' },
  { id: 'graficos', titulo: 'Análises', detalhe: 'Gráficos' },
  { id: 'configuracoes', titulo: 'Configurações', detalhe: 'Preferências' },
];
const groups = [
  { titulo: 'VISÃO GERAL', ids: ['painel','lancamentos','contas','cartoes'] },
  { titulo: 'ORGANIZAÇÃO', ids: ['automacao','metas','graficos'] },
  { titulo: 'PREFERÊNCIAS', ids: ['configuracoes'] },
];
const records = [
  { id: 'demo-a', tipo:'receita', descricao:'Exemplo de salário', valor: 16010,
    data:'2026-11-03', categoria:'Salário', created_at:'2026-11-03T12:00:00Z' },
  { id: 'demo-b', tipo:'despesa', descricao:'Exemplo de moradia', valor: 3200,
    data:'2026-11-06', categoria:'Moradia', created_at:'2026-11-06T12:00:00Z' },
  { id: 'demo-c', tipo:'despesa', descricao:'Exemplo de supermercado', valor: 1430,
    data:'2026-11-11', categoria:'Alimentação', created_at:'2026-11-11T12:00:00Z' },
  { id: 'demo-d', tipo:'despesa', descricao:'Exemplo de transporte', valor: 380,
    data:'2026-11-19', categoria:'Transporte', created_at:'2026-11-19T12:00:00Z' },
  { id: 'demo-e', tipo:'despesa', descricao:'Exemplo de serviço', valor: 2290,
    data:'2026-11-27', categoria:'Outros', created_at:'2026-11-27T12:00:00Z' },
] as unknown as Lancamento[];
const planner = {
  accounts:[{id:'demo-bank',active:true,name:'Conta de teste'}],
  cards:[{id:'demo-card',active:true,name:'Cartão de teste'}],
  goals:[{id:'demo-goal',name:'Reserva de emergência',active:true,target_amount:12000,
    saved_initial:7750,target_date:null}],
  contributions:[],budgets:[{id:'demo-budget',category:'Alimentação',amount:2000}],
  accountOverview:[{account_id:'demo-bank',estimated_balance:12845.9}],
  cardOverview:[{card_id:'demo-card',unpaid_total:470}],
  rules:[],transactions:[],posts:[],
} as unknown as PlannerData;
const summary = { saldo:8710, totalReceitas:16010,totalDespesas:7300 } as ResumoFinanceiro;

/** Temporary QA route only. No server data and no live account access. */
export default function DesignAudit() {
  const {width} = useWindowDimensions();
  const desktop = width >= 900;
  const { isDark, setTheme } = useAccessibility();
  const t = getOceafinTheme(isDark);
  const [active,setActive] = useState<OceanPage['id']>('painel');
  const [month,setMonth] = useState(11);
  const [year,setYear] = useState(2026);
  const [quick,setQuick] = useState('');
  const quickAction=(action:QuickAction) => {
    setQuick(action);
    setActive(action==='transferencia'||action==='cartao'?'contas':'lancamentos');
  };
  return <View style={[styles.frame,{backgroundColor:isDark?'#03182B':'#E5F5FA'}]}>
    {desktop && <OceanSidebar pages={pages} groups={groups}
      active={active} onNavigate={setActive} profileName="Conta de demonstração"/>}
    <View style={styles.content}>
      <ScrollView contentContainerStyle={[styles.main, !desktop && styles.mobile]}>
        <View style={styles.top}>
          <View style={styles.topCopy}>
            <Text style={[styles.overline,{color:isDark?'#59F7E9':'#087FA5'}]}>
              OCEAFIN / {String(month).padStart(2,'0')}.{year}
            </Text>
            <Text style={[styles.title,{color:t.text}]}>Visão geral</Text>
            <Text style={[styles.subtitle,{color:t.muted}]}>
              Suas finanças em equilíbrio, com tudo em um só lugar.
            </Text>
          </View>
          <Pressable onPress={()=>setTheme(isDark?'light':'dark')}
            accessibilityRole="button" accessibilityLabel="Alternar tema"
            style={[styles.theme,{borderColor:t.border}]}>
            <Text style={{color:t.text}}>{isDark?'☀ Claro':'☾ Escuro'}</Text>
          </Pressable>
        </View>
        <PeriodSelector mes={month} ano={year}
          onSelecionar={(m,y)=>{setMonth(m);setYear(y);}}/>
        <OceanPrototypeDashboard resumo={summary} lancamentos={records}
          planner={planner} forecasts={[]} mes={month} ano={year}
          limite={10000} salvandoLimite={false}
          onSalvarLimite={async()=>{}}
          onNavigate={setActive}/>
        <Text testID="audit-nav-state" style={{color:t.muted}}>
          Tela: {active} · Ação: {quick || 'nenhuma'} · Demonstração, dados fictícios
        </Text>
      </ScrollView>
      {!desktop && <OceanBottomNavigation pages={pages} active={active}
        onNavigate={setActive} onQuickAction={quickAction}/>}
    </View>
  </View>;
}
const styles=StyleSheet.create({
  frame:{flex:1,flexDirection:'row',borderRadius:22,overflow:'hidden',borderWidth:1,
    borderColor:'rgba(121,216,234,.4)'},
  content:{flex:1,minWidth:0},
  main:{width:'100%',maxWidth:1350,alignSelf:'center',padding:22,gap:19,paddingBottom:120},
  mobile:{paddingHorizontal:14,paddingTop:16,paddingBottom:130},
  top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
    flexWrap:'wrap',gap:11},
  topCopy:{flex:1,minWidth:180,gap:5},
  overline:{fontSize:10,fontWeight:'800',letterSpacing:1.3},
  title:{fontSize:26,fontWeight:'900'},
  subtitle:{fontSize:12},
  theme:{minHeight:44,borderRadius:13,borderWidth:1,
    paddingHorizontal:13,alignItems:'center',justifyContent:'center'},
});
