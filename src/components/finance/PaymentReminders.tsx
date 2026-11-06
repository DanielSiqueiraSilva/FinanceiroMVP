import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { supabaseAuth } from '../../auth/supabaseClient';
import { useProfileSession } from '../auth/ProtectedFinance';

type Reminder = {
  id: string;
  user_id: string;
  title: string;
  due_date: string;
  amount: number | null;
  email_enabled: boolean;
  is_paid: boolean;
};

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const actual = new Date(Date.UTC(year, month - 1, day));
  return actual.getUTCFullYear() === year && actual.getUTCMonth() + 1 === month &&
    actual.getUTCDate() === day;
};
const prettyDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};
const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/** Lembretes são independentes dos lançamentos: não criam uma despesa automaticamente. */
export function PaymentReminders({ month, year }: { month: number; year: number }) {
  const auth = useProfileSession();
  const userId = auth?.session.user.id;
  const { isDark } = useAccessibility();
  const styles = useAccessibleStyles(baseStyles);
  const [items, setItems] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('28');
  const [monthInput, setMonthInput] = useState(String(month).padStart(2, '0'));
  const [yearInput, setYearInput] = useState(String(year));
  const [amount, setAmount] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMonthInput(String(month).padStart(2, '0'));
    setYearInput(String(year));
  }, [month, year]);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error: queryError } = await supabaseAuth
        .from('payment_reminders').select('id,user_id,title,due_date,amount,email_enabled,is_paid')
        .eq('user_id', userId).order('due_date', { ascending: true }).limit(120);
      if (queryError) throw queryError;
      setItems((data ?? []) as Reminder[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os lembretes.');
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);

  async function add() {
    if (!userId || busy) return;
    const trimmed = title.trim();
    const d = Number(day), m = Number(monthInput), y = Number(yearInput);
    const date = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const parsedAmount = amount.trim() ? Number(amount.trim().replace(',', '.')) : null;
    if (trimmed.length < 2 || trimmed.length > 100 || !validDate(date) || y < 2000 || y > 2100 ||
        (parsedAmount !== null && (!Number.isFinite(parsedAmount) || parsedAmount < 0))) {
      setError('Informe uma descrição, um dia/mês/ano válido e um valor opcional válido.');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: insertError } = await supabaseAuth.from('payment_reminders').insert({
        user_id: userId, title: trimmed, due_date: date,
        amount: parsedAmount, email_enabled: emailEnabled, is_paid: false,
      });
      if (insertError) throw insertError;
      setTitle(''); setAmount('');
      setMessage('Lembrete salvo. Um aviso aparecerá na central na data escolhida, após as 9h.');
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar o lembrete.'); }
    finally { setBusy(false); }
  }

  async function changeItem(item: Reminder, changes: Partial<Pick<Reminder, 'is_paid' | 'email_enabled'>>) {
    if (!userId || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: updateError } = await supabaseAuth.from('payment_reminders')
        .update(changes).eq('id', item.id).eq('user_id', userId);
      if (updateError) throw updateError;
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível atualizar o lembrete.'); }
    finally { setBusy(false); }
  }

  async function remove(item: Reminder) {
    if (!userId || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: deleteError } = await supabaseAuth.from('payment_reminders')
        .delete().eq('id', item.id).eq('user_id', userId);
      if (deleteError) throw deleteError;
      setMessage('Lembrete excluído.');
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível excluir o lembrete.'); }
    finally { setBusy(false); }
  }

  const today = (() => {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const parts = fmt.formatToParts(now);
    const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  })();

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Lembretes de pagamento</Text>
        <Text style={styles.description}>Cadastre contas que precisa pagar. Os avisos aparecem na central no dia do vencimento, após as 9h (horário de Brasília).</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Qual conta deseja lembrar?</Text>
        <TextInput accessibilityLabel="Descrição do pagamento" value={title} onChangeText={setTitle}
          maxLength={100} placeholder="Ex.: Conta de água" style={styles.input}
          placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />

        <Text style={styles.label}>Data do pagamento</Text>
        <View style={styles.dateRow}>
          <View style={styles.datePart}>
            <Text style={styles.dateLabel}>Dia</Text>
            <TextInput accessibilityLabel="Dia do pagamento" keyboardType="number-pad"
              value={day} onChangeText={setDay} maxLength={2} style={styles.input}
              placeholder="28" placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
          </View>
          <View style={styles.datePart}>
            <Text style={styles.dateLabel}>Mês</Text>
            <TextInput accessibilityLabel="Mês do pagamento" keyboardType="number-pad"
              value={monthInput} onChangeText={setMonthInput} maxLength={2} style={styles.input}
              placeholder="11" placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
          </View>
          <View style={styles.datePart}>
            <Text style={styles.dateLabel}>Ano</Text>
            <TextInput accessibilityLabel="Ano do pagamento" keyboardType="number-pad"
              value={yearInput} onChangeText={setYearInput} maxLength={4} style={styles.input}
              placeholder="2026" placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
          </View>
        </View>
        <Text style={styles.label}>Valor previsto (opcional)</Text>
        <TextInput accessibilityLabel="Valor previsto do pagamento" value={amount} onChangeText={setAmount}
          keyboardType="decimal-pad" placeholder="Ex.: 150,00" style={styles.input}
          placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchTitle}>Receber alerta por e-mail</Text>
            <Text style={styles.description}>Somente lembretes essenciais. Requer e-mail confirmado e serviço de envio ativado.</Text>
          </View>
          <Switch accessibilityLabel="Receber lembrete por e-mail" value={emailEnabled}
            onValueChange={setEmailEnabled} trackColor={{ false: '#94A3B8', true: '#7C3AED' }}
            thumbColor="#FFFFFF" />
        </View>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void add()}
          style={[styles.button, busy && styles.disabled]}>
          <Text style={styles.buttonText}>{busy ? 'Salvando...' : 'Adicionar lembrete'}</Text>
        </Pressable>
      </View>

      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}

      <View style={styles.items}>
        <Text style={styles.listTitle}>Meus pagamentos</Text>
        {loading && <ActivityIndicator color="#7C3AED" />}
        {!loading && items.length === 0 && <Text style={styles.description}>Nenhum lembrete cadastrado.</Text>}
        {items.map(item => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.description}>{prettyDate(item.due_date)}{item.amount !== null ? ` · ${money(item.amount)}` : ''}</Text>
              <Text style={styles.itemHint}>{item.is_paid ? 'Pago' : item.due_date < today ? 'Vencido' : 'Pendente'}{item.email_enabled ? ' · Alerta por e-mail ativado' : ''}</Text>
            </View>
            <View style={styles.itemActions}>
              <Pressable accessibilityRole="button" disabled={busy}
                accessibilityLabel={item.email_enabled ? 'Desativar e-mail deste pagamento' : 'Ativar e-mail deste pagamento'}
                style={styles.secondary} onPress={() => void changeItem(item, { email_enabled: !item.email_enabled })}>
                <Text style={styles.secondaryText}>{item.email_enabled ? 'E-mail: ligado' : 'E-mail: desligado'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={item.is_paid ? 'Marcar como pendente' : 'Marcar como pago'}
                disabled={busy} style={styles.secondary} onPress={() => void changeItem(item, { is_paid: !item.is_paid })}>
                <Text style={styles.secondaryText}>{item.is_paid ? 'Reabrir' : 'Marcar pago'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={'Excluir lembrete ' + item.title}
                disabled={busy} style={styles.delete} onPress={() => void remove(item)}>
                <Text style={styles.deleteText}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE8F1',
    borderRadius: 20, padding: 20, gap: 16 },
  heading: { gap: 5 }, title: { fontSize: 19, fontWeight: '800', color: '#111827' },
  description: { fontSize: 12, color: '#4B5563', lineHeight: 19 },
  form: { gap: 9 }, label: { fontSize: 13, fontWeight: '700', color: '#374151' },
  input: { minHeight: 45, borderRadius: 11, borderWidth: 1, borderColor: '#DDD6E6',
    backgroundColor: '#FCFBFD', color: '#111827', fontSize: 15, paddingHorizontal: 12 },
  dateRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  datePart: { flex: 1, minWidth: 70, gap: 4 },
  dateLabel: { fontSize: 12, color: '#6B7280' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 9, justifyContent: 'space-between' },
  switchInfo: { flex: 1, gap: 3 },
  switchTitle: { color: '#111827', fontSize: 13, fontWeight: '700' },
  button: { backgroundColor: '#7C3AED', alignSelf: 'flex-start',
    paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, minHeight: 44 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  error: { color: '#B91C1C', fontSize: 12 },
  success: { color: '#15803D', fontSize: 12 },
  items: { gap: 10 }, listTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  item: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12,
    gap: 9, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  itemInfo: { flex: 1, minWidth: 170, gap: 4 },
  itemTitle: { color: '#111827', fontWeight: '700', fontSize: 14 },
  itemHint: { color: '#5B21B6', fontSize: 11 },
  itemActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  secondary: { padding: 9, borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 8 },
  secondaryText: { fontSize: 12, color: '#5B21B6', fontWeight: '700' },
  delete: { padding: 9, borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8 },
  deleteText: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },
});
