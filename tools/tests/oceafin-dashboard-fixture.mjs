import { existsSync, writeFileSync } from 'node:fs';

// This fixture exists only in the CI runner. It is never committed to src/app.
const path = 'src/app/ocean-layout-qa.tsx';
if (existsSync(path)) throw new Error('Temporary dashboard test route already exists');
writeFileSync(path, `import { ScrollView, View } from 'react-native';
import { useOceanViewport } from '../design/useOceanViewport';
import { OceanPrototypeDashboard } from '../components/dashboard/OceanPrototypeDashboard';
import type { PlannerData } from '../services/finance-planner';
import type { Lancamento, ResumoFinanceiro } from '../types/finance';

const planner = {
  accounts: [{ id: 'qa-account' }], cards: [{ id: 'qa-card' }],
  accountOverview: [{ estimated_balance: 900 }],
  cardOverview: [{ unpaid_total: 280 }],
  goals: [], contributions: [], budgets: [], rules: [], posts: [],
} as unknown as PlannerData;
const resumo: ResumoFinanceiro = {
  saldo: 900, totalReceitas: 1200, totalDespesas: 300,
  quantidadeLancamentos: 2, mes: 11, ano: 2026,
};
const transactions: Lancamento[] = [
  { id: 'qa-in', descricao: 'Salário exemplo', categoria: 'Trabalho',
    data: '2026-11-03', tipo: 'receita', valor: 1200 },
  { id: 'qa-out', descricao: 'Mercado exemplo', categoria: 'Alimentação',
    data: '2026-11-08', tipo: 'despesa', valor: 300 },
];
export default function OceanLayoutQAFixture() {
  const width = useOceanViewport();
  const available = Math.max(280, width - (width >= 1100 ? 275 : 24));
  return <ScrollView style={{ flex: 1, backgroundColor: '#0D1C29' }}
    contentContainerStyle={{ padding: 12, alignItems: 'center' }}>
    <View style={{ width: '100%', maxWidth: Math.min(1250,available) }}>
      <OceanPrototypeDashboard
        resumo={resumo} lancamentos={transactions} planner={planner}
        forecasts={[]} mes={11} ano={2026} limite={0}
        salvandoLimite={false} onSalvarLimite={async () => {}}
        onNavigate={() => {}} onNewTransaction={() => {}}
        onQuickTransaction={() => {}}/>
    </View>
  </ScrollView>;
}
`);
console.log('Created synthetic, test-only Ocean dashboard route');