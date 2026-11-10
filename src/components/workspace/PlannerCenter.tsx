import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { loadPlanner, type PlannerData } from '../../services/finance-planner';
import { PlannerAccounts } from './PlannerAccounts';
import { PlannerAutomation } from './PlannerAutomation';
import { PlannerGoals } from './PlannerGoals';

type Section = 'accounts' | 'automation' | 'goals';
export function PlannerCenter({ section, month, year, onUpdated }: {
  section: Section; month: number; year: number; onUpdated?: () => void;
}) {
  const s = useAccessibleStyles(styles);
  const [data, setData] = useState<PlannerData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; seq.current++; }, []);
  const refresh = useCallback(async () => {
    const id = ++seq.current;
    setError('');
    try {
      const result = await loadPlanner(month, year);
      if (mounted.current && id === seq.current) { setData(result); onUpdated?.(); }
    } catch(e) {
      if (mounted.current && id === seq.current) setError(e instanceof Error ? e.message : 'Não foi possível consultar o planejamento.');
    } finally {
      if (mounted.current && id === seq.current) setLoading(false);
    }
  }, [month, year]);
  useEffect(() => { setLoading(true); void refresh(); }, [refresh]);

  if (loading && !data) return <View style={s.loading}><ActivityIndicator color="#0077C8"/><Text style={s.muted}>Preparando seu planejamento...</Text></View>;
  if (!data || error && !data) return <View style={s.card}>
    <Text style={s.error}>{error || 'Dados indisponíveis.'}</Text>
    <Pressable accessibilityRole="button" onPress={() => { setLoading(true); void refresh(); }} style={s.button}>
      <Text style={s.buttonText}>Tentar novamente</Text>
    </Pressable>
  </View>;
  return <View style={s.content}>
    {error ? <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text> : null}
    {section === 'accounts' && <PlannerAccounts data={data} refresh={refresh}/>}
    {section === 'automation' && <PlannerAutomation data={data} month={month} year={year} refresh={refresh}/>}
    {section === 'goals' && <PlannerGoals data={data} month={month} year={year} refresh={refresh}/>}
  </View>;
}
const styles = StyleSheet.create({
  content: { gap: 12 },
  loading: { paddingVertical: 45, alignItems: 'center', gap: 10 },
  muted: { color: '#6B7280', fontSize: 13 },
  error: { color: '#B91C1C', fontSize: 13 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, gap: 12 },
  button: { backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 11, alignSelf: 'flex-start' },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});
