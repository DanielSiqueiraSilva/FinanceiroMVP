import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { supabaseAuth } from '../../auth/supabaseClient';
import { useProfileSession } from '../auth/ProtectedFinance';
import { useNotifications } from '../../notifications/NotificationsContext';
import {
  createSharedWallet, listSharedWallets, respondSharedInvite,
  type SharedWallet, type WalletInvitation, type WalletUnread,
} from '../../services/shared-wallets-api';
import { WalletDetails } from './WalletDetails';

const countUnread = (counts: WalletUnread[], walletId: string) =>
  Number(counts.find(item => item.wallet_id === walletId)?.unread ?? 0);

export function SharedWallets() {
  const session = useProfileSession()?.session;
  const userId = session?.user.id;
  const notifications = useNotifications();
  const styles = useAccessibleStyles(base);
  const { isDark } = useAccessibility();
  const [wallets, setWallets] = useState<SharedWallet[]>([]);
  const [invitations, setInvitations] = useState<WalletInvitation[]>([]);
  const [unread, setUnread] = useState<WalletUnread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const alive = useRef(true);

  const refresh = useCallback(async (showLoading = false) => {
    if (!userId) return;
    if (showLoading) setLoading(true);
    try {
      const data = await listSharedWallets();
      if (!alive.current) return;
      setWallets(data.wallets ?? []);
      setInvitations(data.invitations ?? []);
      setUnread(data.unreadCounts ?? []);
      setError('');
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : 'Não foi possível carregar carteiras.');
    } finally { if (alive.current) setLoading(false); }
  }, [userId]);

  useEffect(() => {
    alive.current = true;
    void refresh(true);
    return () => { alive.current = false; };
  }, [refresh]);

  useEffect(() => {
    if (!userId || !session?.access_token) return;
    // Convites e alertas recebidos chegam pelo mesmo sistema de notificações.
    // Verificação periódica de acesso fecha o intervalo quando o Realtime cai.
    void supabaseAuth.realtime.setAuth(session.access_token);
    const channel = supabaseAuth.channel('wallet-list-' + userId, { config: { private: true } })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'shared_wallet_invitations',
        filter: 'invited_user_id=eq.' + userId,
      }, () => { void refresh(); })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notification_items',
        filter: 'user_id=eq.' + userId,
      }, () => { void refresh(); })
      .subscribe();
    const interval = setInterval(() => { void refresh(); }, 15000);
    return () => { clearInterval(interval); void supabaseAuth.removeChannel(channel); };
  }, [userId, session?.access_token, refresh]);

  async function create() {
    if (busy) return;
    if (name.trim().length < 2 || name.trim().length > 80 || description.trim().length > 300) {
      setError('Informe um nome com 2 a 80 caracteres e uma descrição de até 300.');
      return;
    }
    setBusy(true); setError('');
    try {
      const wallet = await createSharedWallet(name.trim(), description.trim());
      setName(''); setDescription(''); setCreating(false);
      await refresh();
      notifications?.feedback('notice', 'Carteira criada', wallet.name);
      setSelected(wallet.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao criar carteira.'); }
    finally { setBusy(false); }
  }

  async function answer(invitationId: string, accept: boolean) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await respondSharedInvite(invitationId, accept);
      await refresh();
      notifications?.feedback('notice', accept ? 'Convite aceito' : 'Convite recusado');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível responder ao convite.'); }
    finally { setBusy(false); }
  }

  if (selected) {
    return <WalletDetails key={selected} walletId={selected}
      onBack={() => { setSelected(null); void refresh(true); }}
      onRevoked={() => {
        setSelected(null);
        setError('O acesso à carteira foi encerrado. Seus dados compartilhados não estão mais disponíveis.');
        void refresh(true);
      }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.titleArea}>
          <Text style={styles.title} accessibilityRole="header">Carteiras Compartilhadas</Text>
          <Text style={styles.subtitle}>
            Organize despesas e receitas em conjunto, com chat exclusivo para cada carteira.
          </Text>
        </View>
        <Pressable onPress={() => setCreating(value => !value)}
          accessibilityRole="button" style={styles.primaryButton}>
          <Text style={styles.primaryText}>{creating ? 'Cancelar' : '+ Criar carteira'}</Text>
        </Pressable>
      </View>

      {creating && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nova carteira</Text>
          <Text style={styles.label}>Nome</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName}
            placeholder="Ex.: Casa" maxLength={80} accessibilityLabel="Nome da carteira"
            placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline
            value={description} onChangeText={setDescription}
            placeholder="Ex.: Contas e despesas compartilhadas" maxLength={300}
            accessibilityLabel="Descrição da carteira"
            placeholderTextColor={isDark ? '#CBD5E1' : '#6B7280'} />
          <Pressable accessibilityRole="button" disabled={busy} style={[styles.primaryButton, busy && styles.disabled]}
            onPress={() => void create()}>
            <Text style={styles.primaryText}>{busy ? 'Salvando...' : 'Criar carteira'}</Text>
          </Pressable>
        </View>
      )}

      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {loading && <ActivityIndicator color="#7C3AED" />}

      {invitations.length > 0 && (
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Convites recebidos ({invitations.length})</Text>
          {invitations.map(inv => (
            <View key={inv.id} style={styles.rowCard}>
              <View style={styles.rowCopy}>
                <Text style={styles.itemTitle}>{inv.wallet_name}</Text>
                <Text style={styles.subtitle}>Convite de {inv.invited_by_name} · válido até {new Date(inv.expires_at).toLocaleDateString('pt-BR')}</Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable onPress={() => void answer(inv.id, true)} disabled={busy}
                  accessibilityRole="button" accessibilityLabel={'Aceitar convite para ' + inv.wallet_name}
                  style={styles.smallPrimary}>
                  <Text style={styles.primaryText}>Aceitar</Text>
                </Pressable>
                <Pressable onPress={() => void answer(inv.id, false)} disabled={busy}
                  accessibilityRole="button" accessibilityLabel={'Recusar convite para ' + inv.wallet_name}
                  style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Recusar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Minhas carteiras ({wallets.length})</Text>
        {!loading && wallets.length === 0 && (
          <Text style={styles.subtitle}>Você ainda não participa de nenhuma carteira. Crie uma ou aceite um convite.</Text>
        )}
        {wallets.map(wallet => {
          const amount = countUnread(unread, wallet.id);
          return (
            <Pressable key={wallet.id} accessibilityRole="button"
              accessibilityLabel={'Abrir carteira ' + wallet.name +
                (amount ? ', ' + amount + ' mensagens não lidas' : '')}
              onPress={() => setSelected(wallet.id)}
              style={styles.walletCard}>
              <View style={styles.walletIcon}><Text style={styles.walletIconText}>◈</Text></View>
              <View style={styles.walletText}>
                <Text style={styles.itemTitle}>{wallet.name}</Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {wallet.description || 'Sem descrição'} · {wallet.owner_id === userId ? 'Proprietário' : 'Participante'}
                </Text>
              </View>
              {amount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{amount > 99 ? '99+' : amount}</Text>
                </View>
              )}
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const base = StyleSheet.create({
  container: { gap: 18, width: '100%' },
  heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    alignItems: 'center', gap: 12 },
  titleArea: { flex: 1, minWidth: 220, gap: 5 },
  title: { fontSize: 25, fontWeight: '900', color: '#111827' },
  subtitle: { color: '#6B7280', fontSize: 13, lineHeight: 19 },
  card: { borderWidth: 1, borderColor: '#ECE8F1', backgroundColor: '#FFFFFF',
    borderRadius: 18, padding: 18, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  label: { fontSize: 13, fontWeight: '700', color: '#374151' },
  input: { borderWidth: 1, borderRadius: 12, borderColor: '#DDD6E6',
    backgroundColor: '#FCFBFD', color: '#111827', fontSize: 15, padding: 12, minHeight: 46 },
  multiline: { minHeight: 75, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  smallPrimary: { backgroundColor: '#7C3AED', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 42, justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondaryButton: { borderWidth: 1, borderColor: '#DDD6E6', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 42, justifyContent: 'center' },
  secondaryText: { color: '#5B21B6', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  error: { color: '#B91C1C', fontSize: 13 },
  rowCard: { borderWidth: 1, borderColor: '#ECE8F1', borderRadius: 12,
    padding: 13, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  rowCopy: { flex: 1, minWidth: 180, gap: 4 },
  rowActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  itemTitle: { color: '#111827', fontWeight: '800', fontSize: 15 },
  walletCard: { flexDirection: 'row', gap: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#ECE8F1', borderRadius: 13,
    padding: 14, minHeight: 73, backgroundColor: '#FCFBFD' },
  walletIcon: { width: 43, height: 43, borderRadius: 12, backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center' },
  walletIconText: { fontSize: 26, color: '#5B21B6' },
  walletText: { flex: 1, minWidth: 100, gap: 3 },
  arrow: { color: '#6D28D9', fontSize: 24 },
  badge: { borderRadius: 15, backgroundColor: '#7C3AED',
    minWidth: 24, minHeight: 24, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
});
