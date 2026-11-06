import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useNotifications, type NotificationKind } from '../../notifications/NotificationsContext';

const LABELS: Record<NotificationKind, string> = {
  finance: 'Financeiro', message: 'Mensagem', warning: 'Atenção', system: 'Sistema',
};
function formatDate(date: string) {
  try { return new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return ''; }
}

/** Um sino discreto no cabeçalho, sem substituir o layout financeiro. */
export function NotificationCenter() {
  const n = useNotifications();
  const styles = useAccessibleStyles(baseStyles);
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  if (!n) return null;

  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Notificações, ${n.unread} não lidas`}
        accessibilityHint="Abrir central de notificações" onPress={() => { n.click(); setOpen(true); }}
        style={styles.bell}>
        <Text style={styles.bellIcon}>🔔</Text>
        {n.unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{n.unread > 99 ? '99+' : n.unread}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} accessibilityRole="button"
            accessibilityLabel="Fechar notificações" onPress={() => setOpen(false)} />
          <View style={[styles.panel, { width: Math.min(450, width - 24), maxHeight: height - 28 }]}>
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <Text accessibilityRole="header" style={styles.title}>Notificações</Text>
                <Text style={styles.subtitle}>{n.live ? '● Em tempo real' : '○ Conexão em atualização'}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar"
                onPress={() => setOpen(false)} style={styles.close}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.action} accessibilityRole="button"
                onPress={() => { n.click(); void n.refresh(); }}>
                <Text style={styles.actionText}>Atualizar</Text>
              </Pressable>
              <Pressable style={styles.action} accessibilityRole="button"
                disabled={n.unread === 0} onPress={() => { n.click(); void n.markAllRead(); }}>
                <Text style={[styles.actionText, n.unread === 0 && styles.disabled]}>Marcar todas como lidas</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator>
              {!!n.error && <Text style={styles.error} accessibilityLiveRegion="polite">{n.error}</Text>}
              {n.loading ? <Text style={styles.empty}>Carregando notificações...</Text> : null}
              {!n.loading && n.entries.length === 0 && !n.error ? (
                <Text style={styles.empty}>Nenhuma notificação por enquanto. Os avisos de movimentações financeiras aparecerão aqui.</Text>
              ) : null}
              {n.entries.map(entry => (
                <Pressable key={entry.id} accessibilityRole="button"
                  accessibilityLabel={`${entry.is_read ? 'Lida' : 'Não lida'}: ${entry.title}. ${entry.description}`}
                  style={[styles.entry, !entry.is_read && styles.unreadEntry]}
                  onPress={() => { if (!entry.is_read) void n.markRead(entry.id); }}
                >
                  <View style={styles.entryTop}>
                    <View style={styles.kind}>
                      <Text style={styles.kindText}>{LABELS[entry.category] ?? 'Aviso'}</Text>
                    </View>
                    {!entry.is_read && <View style={styles.dot} />}
                    <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
                  </View>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  {!!entry.description && <Text style={styles.entryBody}>{entry.description}</Text>}
                  {!entry.is_read && <Text style={styles.readHint}>Toque para marcar como lida</Text>}
                </Pressable>
              ))}
              {n.hasMore && <Pressable accessibilityRole="button" style={styles.more}
                disabled={n.loadingOlder} onPress={() => void n.loadOlder()}>
                <Text style={styles.actionText}>{n.loadingOlder ? 'Carregando...' : 'Ver notificações antigas'}</Text>
              </Pressable>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  bell: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#FFFFFF', borderColor: '#DDD6E6',
    borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  bellIcon: { fontSize: 22 },
  badge: { position: 'absolute', top: -5, right: -5, borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 3, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  overlay: { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-start', padding: 12 },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.40)' },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#DDD6E6',
    padding: 15, maxWidth: 450, shadowColor: '#111827', shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headerTitle: { flex: 1, gap: 3 },
  title: { color: '#111827', fontWeight: '800', fontSize: 19 },
  subtitle: { color: '#6B7280', fontSize: 11 },
  close: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  closeText: { color: '#374151', fontSize: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, marginBottom: 8 },
  action: { paddingVertical: 6, minHeight: 38, justifyContent: 'center' },
  actionText: { color: '#5B21B6', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  scroll: { gap: 8, paddingBottom: 12, paddingTop: 5 },
  error: { color: '#B91C1C', fontSize: 12 },
  empty: { color: '#6B7280', fontSize: 13, lineHeight: 19, paddingVertical: 18 },
  entry: { borderWidth: 1, borderColor: '#ECE8F1', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, gap: 5 },
  unreadEntry: { borderColor: '#8B5CF6', backgroundColor: '#EDE9FE' },
  entryTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  kind: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7, backgroundColor: '#F4F1F8' },
  kindText: { fontSize: 10, fontWeight: '700', color: '#5B21B6' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#7C3AED' },
  date: { fontSize: 10, color: '#6B7280', flexShrink: 1 },
  entryTitle: { fontSize: 13, color: '#111827', fontWeight: '700' },
  entryBody: { fontSize: 12, color: '#4B5563', lineHeight: 17 },
  readHint: { fontSize: 10, color: '#5B21B6' },
  more: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
