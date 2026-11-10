import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAccessibility } from '../accessibility/AccessibilityContext';
import { useAccessibleStyles } from '../accessibility/useAccessibleStyles';
import { OceanSidebar, OceanBottomNavigation, type OceanPage,
  type QuickAction } from '../components/navigation/OceanNavigation';
import { OceanHero } from '../components/dashboard/OceanHero';
import { OceanFlowChart } from '../components/dashboard/OceanFlowChart';
import { PeriodSelector } from '../components/finance/PeriodSelector';
import { getOceafinTheme } from '../design/tokens';
import type { Lancamento } from '../types/finance';

const PAGES: OceanPage[] = [
  { id: 'painel', titulo: 'Início', detalhe: 'Sua visão geral' },
  { id: 'lancamentos', titulo: 'Lançamentos', detalhe: 'Entradas e saídas' },
  { id: 'contas', titulo: 'Contas e cartões', detalhe: 'Seu dinheiro' },
  { id: 'metas', titulo: 'Planejamento', detalhe: 'Metas e orçamento' },
  { id: 'automacao', titulo: 'Automações', detalhe: 'Recorrências' },
  { id: 'graficos', titulo: 'Análises', detalhe: 'Gráficos' },
  { id: 'configuracoes', titulo: 'Configurações', detalhe: 'Preferências' },
];
const GROUPS = [
  { titulo: 'PRINCIPAL', ids: ['painel','lancamentos','contas','metas','automacao','graficos'] },
  { titulo: 'PREFERÊNCIAS', ids: ['configuracoes'] },
];
/** DEMONSTRAÇÃO. No production data and no backend calls. Remove before merge. */
const SAMPLE = [
  { id:'demo-1', tipo:'receita', valor:5200, categoria:'Salário', data:'2026-11-03', descricao:'Exemplo de entrada' },
  { id:'demo-2', tipo:'despesa', valor:870, categoria:'Moradia', data:'2026-11-08', descricao:'Exemplo de conta' },
  { id:'demo-3', tipo:'despesa', valor:320, categoria:'Alimentação', data:'2026-11-15', descricao:'Exemplo de mercado' },
  { id:'demo-4', tipo:'receita', valor:430, categoria:'Outros', data:'2026-11-20', descricao:'Exemplo de entrada' },
  { id:'demo-5', tipo:'despesa', valor:164, categoria:'Transporte', data:'2026-11-26', descricao:'Exemplo de transporte' },
] as unknown as Lancamento[];

export default function OceafinVisualPreview() {
  const { isDark } = useAccessibility();
  const t = getOceafinTheme(isDark);
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [active, setActive] = useState<OceanPage['id']>('painel');
  const [hidden, setHidden] = useState(false);
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [lastAction, setLastAction] = useState('');
  const quick = (action: QuickAction) => {
    setLastAction(action);
    setActive(action === 'receita' || action === 'despesa' ? 'lancamentos' : 'contas');
  };
  return <View testID="oceafin-design-preview"
    style={[styles.shell, { backgroundColor: t.page }]}>
    {desktop && <OceanSidebar pages={PAGES} groups={GROUPS}
      active={active} onNavigate={setActive}/>}
    <View style={styles.main}>
      <ScrollView style={styles.scroll}
        contentContainerStyle={[styles.body, !desktop && styles.bodyMobile]}>
        <View style={styles.previewLabel}>
          <Text style={[styles.previewText, { color: t.muted }]}>
            HOMOLOGAÇÃO VISUAL · DADOS FICTÍCIOS · NÃO É UMA CONTA
          </Text>
        </View>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.overline, { color: t.link }]}>
              OCEAFIN · SUAS FINANÇAS, MAIS SIMPLES.
            </Text>
            <Text accessibilityRole="header" style={[styles.title, { color: t.text }]}>
              Visão geral
            </Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>
              Um panorama claro para decisões mais tranquilas.
            </Text>
          </View>
          <Text style={[styles.initials, { color: t.text, backgroundColor: t.selected }]}>OF</Text>
        </View>
        <PeriodSelector mes={month} ano={year}
          onSelecionar={(m,y) => {setMonth(m);setYear(y);}}/>
        <OceanHero balance={12845.5} monthResult={4276}
          period={String(month).padStart(2,'0')+'/'+year}
          hidden={hidden} onToggle={() => setHidden(!hidden)}
          onAccounts={() => setActive('contas')}/>
        <View style={styles.kpis}>
          {[
            {title:'Receitas',value:'R$ 5.630,00',color:'#087D70'},
            {title:'Despesas',value:'R$ 1.354,00',color:'#B4534E'},
          ].map(x => <View key={x.title}
            style={[styles.kpi, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.kpiLabel, { color: t.muted }]}>{x.title}</Text>
            <Text style={[styles.kpiValue, { color: x.color }]}>
              {hidden ? 'R$ •••••' : x.value}</Text>
          </View>)}
        </View>
        <OceanFlowChart items={SAMPLE} period={String(month).padStart(2,'0')+'/'+year}
          onDetails={() => setActive('graficos')} hidden={hidden}/>
        <View style={[styles.bottomCard,{backgroundColor:t.surface,borderColor:t.border}]}>
          <Text style={[styles.bottomTitle,{color:t.text}]}>
            Próximos vencimentos e planejamento
          </Text>
          <Text style={[styles.bottomText,{color:t.muted}]}>
            Componentes finais recebem lançamentos e compromissos reais apenas na aplicação autenticada.
          </Text>
          <Text style={[styles.bottomText,{color:t.muted}]}>
            Seção selecionada: {active}. Ação rápida: {lastAction || 'nenhuma'}.
          </Text>
        </View>
      </ScrollView>
      {!desktop && <OceanBottomNavigation pages={PAGES}
        active={active} onNavigate={setActive} onQuickAction={quick} />}
    </View>
  </View>;
}

const styles=StyleSheet.create({
  shell: {flex:1,flexDirection:'row'},
  main:{flex:1,minWidth:0},
  scroll:{flex:1},
  body:{alignSelf:'center',width:'100%',maxWidth:1160,paddingHorizontal:26,
    paddingTop:25,paddingBottom:100,gap:20},
  bodyMobile:{paddingTop:16,paddingHorizontal:14,paddingBottom:130,gap:16},
  previewLabel:{alignSelf:'flex-start'},
  previewText:{fontSize:10,fontWeight:'800',letterSpacing:1},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  headerCopy:{flex:1,gap:4},
  overline:{fontSize:10,letterSpacing:1,fontWeight:'800'},
  title:{fontSize:30,fontWeight:'900'},
  subtitle:{fontSize:13},
  initials:{width:46,height:46,borderRadius:15,fontWeight:'900',overflow:'hidden',
    textAlign:'center',textAlignVertical:'center',lineHeight:46},
  kpis:{flexDirection:'row',gap:12,flexWrap:'wrap'},
  kpi:{flexGrow:1,flexBasis:170,borderRadius:20,padding:20,borderWidth:1,gap:8},
  kpiLabel:{fontSize:13,fontWeight:'700'},
  kpiValue:{fontSize:22,fontWeight:'900'},
  bottomCard:{borderWidth:1,borderRadius:20,padding:20,gap:12},
  bottomTitle:{fontWeight:'900',fontSize:18},
  bottomText:{fontSize:12,lineHeight:18},
});
