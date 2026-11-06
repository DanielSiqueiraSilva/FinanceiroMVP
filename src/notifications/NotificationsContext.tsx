import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type PropsWithChildren,
} from 'react';
import {
  AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { supabaseAuth } from '../auth/supabaseClient';
import { useProfileSession } from '../components/auth/ProtectedFinance';
import { useAccessibleStyles } from '../accessibility/useAccessibleStyles';
import { playNotificationSound, type SoundName } from './sound';
import { readSiteSoundEnabled, writeSiteSoundEnabled, observeSiteSoundEnabled } from './soundPreference';
import { useAccessibility } from '../accessibility/AccessibilityContext';

export type NotificationKind = 'finance' | 'message' | 'warning' | 'system';
export type NotificationEntry = {
  id: string;
  user_id: string;
  category: NotificationKind;
  title: string;
  description: string;
  is_read: boolean;
  created_at: string;
};
export type NotificationSettings = {
  enabled: boolean;
  sounds: boolean;
  clickSounds: boolean;
  finance: boolean;
  message: boolean;
  warning: boolean;
  system: boolean;
};
const defaults: NotificationSettings = {
  enabled: true, sounds: false, clickSounds: false,
  finance: true, message: true, warning: true, system: true,
};
type LocalTone = 'success' | 'warning' | 'notice' | 'message';
type NotificationsState = {
  entries: NotificationEntry[];
  unread: number;
  loading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  error: string;
  live: boolean;
  settings: NotificationSettings;
  changeSettings: (changes: Partial<NotificationSettings>) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  loadOlder: () => Promise<void>;
  refresh: () => Promise<void>;
  feedback: (tone: LocalTone, title: string, description?: string) => void;
  click: () => void;
  testSound: () => void;
};
const Context = createContext<NotificationsState | null>(null);
export function useNotifications() { return useContext(Context); }
type Toast = { id: number; title: string; description: string; tone: LocalTone };
function storageKey(userId: string) { return `finanmvp:notification-preferences:${userId}`; }
function readSettings(userId: string): NotificationSettings {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return { ...defaults };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...defaults, sounds: readSiteSoundEnabled() };
    const stored = JSON.parse(raw) as Partial<NotificationSettings>;
    const result = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof NotificationSettings)[]) {
      if (typeof stored[key] === 'boolean') result[key] = stored[key]!;
    }
    return result;
  } catch { return { ...defaults }; }
}

export function NotificationsProvider({ children }: PropsWithChildren) {
  const session = useProfileSession()?.session;
  const { reduceMotion } = useAccessibility();
  const userId = session?.user.id ?? null;
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({ ...defaults });
  const settingsRef = useRef(settings);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const serial = useRef(0);
  const recentLocalAction = useRef(0);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(-12)).current;
  const [reducedMotion, setReducedMotion] = useState(false);
  const styles = useAccessibleStyles(baseStyles);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (active) setReducedMotion(v); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const loaded = userId ? readSettings(userId) : { ...defaults };
    settingsRef.current = loaded;
    setSettings(loaded);
    if (userId && Platform.OS === 'web') writeSiteSoundEnabled(loaded.sounds);
    setEntries([]);
    setLive(false);
    setError('');
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return observeSiteSoundEnabled(enabled => {
      if (settingsRef.current.sounds === enabled) return;
      const next = { ...settingsRef.current, sounds: enabled };
      settingsRef.current = next;
      setSettings(next);
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); } catch {}
      }
    });
  }, [userId]);

  const changeSettings = useCallback((changes: Partial<NotificationSettings>) => {
    const next = { ...settingsRef.current, ...changes };
    settingsRef.current = next;
    setSettings(next);
    if (typeof changes.sounds === 'boolean') writeSiteSoundEnabled(changes.sounds);
    if (userId && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); } catch {}
    }
  }, [userId]);

  const displayToast = useCallback((tone: LocalTone, title: string, description = '') => {
    if (!settingsRef.current.enabled) return;
    const key: NotificationKind = tone === 'success' ? 'finance' :
      tone === 'notice' ? 'system' : tone === 'message' ? 'message' : 'warning';
    if (!settingsRef.current[key]) return;
    const id = ++serial.current;
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ id, tone, title, description });
    fade.setValue(reducedMotion || reduceMotion ? 1 : 0);
    rise.setValue(reducedMotion || reduceMotion ? 0 : -12);
    if (!reducedMotion && !reduceMotion) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(rise, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
    }
    toastTimeout.current = setTimeout(() => setToast(current => current?.id === id ? null : current), 4500);
  }, [fade, reducedMotion, reduceMotion, rise]);

  const play = useCallback((sound: SoundName) => {
    if (settingsRef.current.enabled && settingsRef.current.sounds) playNotificationSound(sound);
  }, []);
  const click = useCallback(() => {
    if (settingsRef.current.sounds && settingsRef.current.clickSounds) playNotificationSound('click');
  }, []);
  const testSound = useCallback(() => {
    // Teste é sempre acionado explicitamente pelo usuário.
    playNotificationSound('message');
  }, []);

  const feedback = useCallback((tone: LocalTone, title: string, description = '') => {
    recentLocalAction.current = Date.now();
    displayToast(tone, title, description);
    play(tone === 'notice' ? 'notice' : tone);
  }, [displayToast, play]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: requestError } = await supabaseAuth
        .from('notification_items').select('*')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(40);
      if (requestError) throw requestError;
      setEntries((data ?? []) as NotificationEntry[]);
      setHasMore((data?.length ?? 0) === 40);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar notificações.');
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => {
    if (!userId || !session?.access_token) return;
    let valid = true;
    void refresh();
    // Supabase mantém a sessão em memória; a assinatura também precisa do JWT.
    void supabaseAuth.realtime.setAuth(session.access_token);
    const channel = supabaseAuth.channel(`user-notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notification_items',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        if (!valid) return;
        const incoming = payload.new as NotificationEntry;
        if (incoming.user_id !== userId || typeof incoming.id !== 'string') return;
        setEntries(prev => [incoming, ...prev.filter(n => n.id !== incoming.id)].slice(0, 200));
        const settings = settingsRef.current;
        if (!settings.enabled || !settings[incoming.category]) return;
        // Uma ação local já mostra feedback imediatamente; não repeti-lo.
        if (incoming.category === 'finance' && Date.now() - recentLocalAction.current < 3800) return;
        displayToast(incoming.category === 'finance' ? 'success' :
          incoming.category === 'system' ? 'notice' : incoming.category,
          incoming.title, incoming.description);
        if (settings.sounds) play(incoming.category === 'finance' ? 'success' :
          incoming.category === 'system' ? 'notice' : incoming.category);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notification_items',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        if (!valid) return;
        const row = payload.new as NotificationEntry;
        if (row.user_id !== userId) return;
        setEntries(prev => prev.map(n => n.id === row.id ? row : n));
      })
      .subscribe(status => {
        if (valid) setLive(status === 'SUBSCRIBED');
      });

    return () => {
      valid = false;
      setLive(false);
      void supabaseAuth.removeChannel(channel);
    };
  }, [userId, session?.access_token, refresh, displayToast, play]);

  const markRead = useCallback(async (id: string) => {
    if (!userId) return;
    const { error: e } = await supabaseAuth.from('notification_items')
      .update({ is_read: true }).eq('id', id).eq('user_id', userId);
    if (e) { setError(e.message); return; }
    setEntries(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const { error: e } = await supabaseAuth.from('notification_items')
      .update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    if (e) { setError(e.message); return; }
    setEntries(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [userId]);

  const loadOlder = useCallback(async () => {
    if (!userId || !hasMore || loadingOlder || !entries.length) return;
    setLoadingOlder(true);
    try {
      const { data, error: e } = await supabaseAuth.from('notification_items').select('*')
        .eq('user_id', userId)
        .lt('created_at', entries[entries.length - 1].created_at)
        .order('created_at', { ascending: false }).limit(40);
      if (e) throw e;
      const next = (data ?? []) as NotificationEntry[];
      setEntries(prev => [...prev, ...next.filter(n => !prev.some(p => p.id === n.id))]);
      setHasMore(next.length === 40);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar mais avisos.'); }
    finally { setLoadingOlder(false); }
  }, [entries, hasMore, loadingOlder, userId]);

  useEffect(() => () => { if (toastTimeout.current) clearTimeout(toastTimeout.current); }, []);

  const value = useMemo<NotificationsState>(() => ({
    entries, unread: entries.filter(n => !n.is_read).length, loading, loadingOlder, hasMore,
    error, live, settings, changeSettings, markRead, markAllRead, loadOlder, refresh,
    feedback, click, testSound,
  }), [entries, loading, loadingOlder, hasMore, error, live, settings,
    changeSettings, markRead, markAllRead, loadOlder, refresh, feedback, click, testSound]);

  return (
    <Context.Provider value={value}>
      <View style={styles.root}>
        {children}
        {toast && (
          <Animated.View
            pointerEvents="box-none"
            style={[styles.toast, { opacity: fade, transform: [{ translateY: rise }] }]}
          >
            <View style={styles.toastText}>
              <Text style={styles.toastTitle} accessibilityLiveRegion="polite">{toast.title}</Text>
              {!!toast.description && <Text style={styles.toastDescription}>{toast.description}</Text>}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar aviso"
              onPress={() => setToast(null)} style={styles.toastClose}>
              <Text style={styles.toastCloseText}>×</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Context.Provider>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1 },
  toast: {
    position: 'absolute', top: 14, right: 12, left: 12, zIndex: 1000,
    maxWidth: 410, alignSelf: 'flex-end', flexDirection: 'row', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#FFFFFF',
    borderColor: '#DDD6E6', borderWidth: 1, borderRadius: 14,
    shadowColor: '#111827', shadowOpacity: 0.12, shadowRadius: 10,
    elevation: 6,
  },
  toastText: { flex: 1, gap: 3 },
  toastTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  toastDescription: { fontSize: 12, color: '#4B5563', lineHeight: 17 },
  toastClose: { width: 30, alignItems: 'center', justifyContent: 'flex-start' },
  toastCloseText: { fontSize: 22, color: '#6B7280' },
});
