import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type PropsWithChildren,
} from 'react';
import {
  ActivityIndicator, AppState, Platform, Pressable, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { authConfigured, supabaseAuth } from '../../auth/supabaseClient';
import {
  isNativeQuickUnlock, checkQuickUnlock, getQuickUserId,
  enableQuickUnlock, readQuickCredential, updateQuickCredential,
  disableQuickUnlock,
} from '../../auth/quickUnlock';

const IDLE_MS = 15 * 60 * 1000;

type ProfileSessionValue = {
  session: Session;
  signOut: () => Promise<void>;
  lock: () => void;
  nativeEnabled: boolean;
  nativeBusy: boolean;
  nativeMessage: string;
  activateNative: () => Promise<void>;
  deactivateNative: () => Promise<void>;
};
const ProfileSessionContext = createContext<ProfileSessionValue | null>(null);
export function useProfileSession() { return useContext(ProfileSessionContext); }

type LoginProps = {
  hasQuickAccount: boolean;
  onQuickLogin: () => Promise<string>;
  onRemoteLogin: (email: string, password: string) => Promise<string>;
};
function LoginScreen({ hasQuickAccount, onQuickLogin, onRemoteLogin }: LoginProps) {
  const [cadastro, setCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [busy, setBusy] = useState(false);
  const [mensagem, setMensagem] = useState('');

  async function login(byQuick: boolean) {
    if (busy) return;
    if (!authConfigured) {
      setMensagem('Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
      return;
    }
    if (!byQuick && (!email.includes('@') || senha.length < 6 || (cadastro && !nome.trim()))) {
      setMensagem('Informe e-mail, senha de pelo menos 6 caracteres e nome no cadastro.');
      return;
    }
    setBusy(true);
    setMensagem('');
    try {
      if (byQuick) {
        setMensagem(await onQuickLogin());
      } else if (cadastro) {
        const { data, error } = await supabaseAuth.auth.signUp({
          email: email.trim().toLowerCase(), password: senha,
          options: { data: { full_name: nome.trim() } },
        });
        if (error) throw error;
        if (data.session) await supabaseAuth.auth.signOut({ scope: 'local' });
        setCadastro(false);
        setMensagem('Cadastro realizado. Confirme seu e-mail, se necessário, e entre com a senha.');
      } else {
        setMensagem(await onRemoteLogin(email.trim().toLowerCase(), senha));
      }
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : 'Não foi possível autenticar.');
    } finally {
      setSenha('');
      setBusy(false);
    }
  }

  return (
    <View style={styles.center}>
      <View style={styles.panel}>
        <Text accessibilityRole="header" style={styles.title}>FinanMVP</Text>
        <Text style={styles.subtitle}>{cadastro ? 'Criar uma conta' : 'Entrar na conta'}</Text>
        {!cadastro && isNativeQuickUnlock && hasQuickAccount && (
          <Pressable style={styles.quickButton} accessibilityRole="button" disabled={busy} onPress={() => void login(true)}>
            <Text style={styles.primaryText}>Entrar com biometria</Text>
          </Pressable>
        )}
        {!cadastro && hasQuickAccount && <Text style={styles.hint}>Ou entre com e-mail e senha.</Text>}
        {cadastro && <TextInput style={styles.input} placeholder="Nome" placeholderTextColor="#94A3B8" value={nome} onChangeText={setNome} accessibilityLabel="Nome" autoCapitalize="words" />}
        <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} accessibilityLabel="E-mail" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#94A3B8" value={senha} onChangeText={setSenha} accessibilityLabel="Senha" secureTextEntry autoComplete={cadastro ? 'new-password' : 'current-password'} />
        <Pressable accessibilityRole="button" disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => void login(false)}>
          <Text style={styles.primaryText}>{busy ? 'Verificando...' : cadastro ? 'Criar conta' : 'Entrar com senha'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => { setCadastro(!cadastro); setMensagem(''); }}>
          <Text style={styles.link}>{cadastro ? 'Já tenho uma conta' : 'Criar conta'}</Text>
        </Pressable>
        {mensagem ? <Text style={styles.message} accessibilityLiveRegion="polite">{mensagem}</Text> : null}
      </View>
    </View>
  );
}

/** O estado remoto do Supabase NÃO abre a tela: somente allowSession faz isso. */
export function ProtectedFinance({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [quickUserId, setQuickUserId] = useState<string | null>(null);
  const [nativeEnabled, setNativeEnabled] = useState(false);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [nativeMessage, setNativeMessage] = useState('');
  const [banner, setBanner] = useState('');
  const approvedRef = useRef<Session | null>(null);
  const lastActivityRef = useRef(Date.now());
  const stateRef = useRef<string | null | undefined>(AppState.currentState);
  const isAppInBackground = useCallback(() => stateRef.current === 'background', []);
  const promptRef = useRef(false);
  const generationRef = useRef(0);

  const activity = useCallback(() => { lastActivityRef.current = Date.now(); }, []);
  const lock = useCallback((reason = 'bloqueio nao especificado') => {
    console.info('[FinanceiroMVP][sessao] BLOQUEIO:', reason, '| AppState:', stateRef.current);
    generationRef.current++;
    approvedRef.current = null;
    setSession(null);
    setNativeBusy(false);
    setNativeMessage('');
    if (isNativeQuickUnlock) supabaseAuth.auth.stopAutoRefresh();
    // Em native, mantém apenas a credencial protegida para desbloqueio futuro.
    // Em web, usamos logout tradicional no evento de mudança de aba.
  }, []);
  const allowSession = useCallback((approved: Session, enabled: boolean) => {
    console.info('[FinanceiroMVP][sessao] Login APROVADO | AppState:', stateRef.current);
    approvedRef.current = approved;
    setSession(approved);
    setNativeEnabled(enabled);
    activity();
    setBanner('');
    if (isNativeQuickUnlock) supabaseAuth.auth.startAutoRefresh();
  }, [activity]);

  const signOut = useCallback(async () => {
    const userId = approvedRef.current?.user.id;
    lock('logout pelo botao Sair');
    setQuickUserId(null);
    setNativeEnabled(false);
    if (isNativeQuickUnlock && userId) {
      try { await disableQuickUnlock(userId); } catch (e) { console.warn('Falha ao excluir credencial local', e); }
    }
    // Revoga o refresh token corrente no Supabase quando conectado.
    try { await supabaseAuth.auth.signOut({ scope: 'local' }); } catch (e) { console.warn('Falha no logout remoto', e); }
  }, [lock]);

  useEffect(() => {
    if (!isNativeQuickUnlock) return;
    let alive = true;
    getQuickUserId().then(id => { if (alive) setQuickUserId(id); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((event, newSession) => {
      console.info('[FinanceiroMVP][sessao] Evento Supabase:', event, '| session:', Boolean(newSession));
      // Não chamar setSession para SIGNED_IN ou INITIAL_SESSION: ignora acesso automático.
      if (event === 'SIGNED_OUT') {
        console.info('[FinanceiroMVP] Supabase emitiu SIGNED_OUT; confira a origem do logout se ele não foi solicitado.');
        lock('SIGNED_OUT emitido pelo Supabase');
        return;
      }
      const current = approvedRef.current;
      if (current && newSession?.user.id === current.user.id &&
        (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED')) {
        approvedRef.current = newSession;
        setSession(newSession);
        if (event === 'TOKEN_REFRESHED' && isNativeQuickUnlock && nativeEnabled && stateRef.current === 'active') {
          // Supabase gira o refresh token; mantenha a cópia protegida atualizada.
          // Em Android essa escrita pode pedir autenticação nativa novamente.
          promptRef.current = true;
          void updateQuickCredential(newSession.user.id, newSession.refresh_token)
            .catch(() => setNativeMessage('Credencial rápida desatualizada. Use senha e reative a biometria.'))
            .finally(() => { promptRef.current = false; });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [lock, nativeEnabled]);

  // Reforço do bloqueio em inatividade, segundo plano ou troca de aba.
  useEffect(() => {
    const check = setInterval(() => {
      if (approvedRef.current && Date.now() - lastActivityRef.current >= IDLE_MS) {
        setBanner('Aplicativo bloqueado por inatividade.');
        lock('15 minutos sem atividade');
      }
    }, 5_000);
    const sub = AppState.addEventListener('change', next => {
      console.info('[FinanceiroMVP][sessao] AppState:', stateRef.current, '->', next);
      stateRef.current = next;
      // No iOS, "inactive" pode ser uma interrupção momentânea do sistema
      // (por exemplo, uma caixa de diálogo); só bloqueia ao ir para segundo plano.
      if (next === 'background' && (approvedRef.current || promptRef.current)) {
        setBanner('Aplicativo bloqueado ao sair.');
        lock('AppState background');
      }
    });
    let onVisibility: (() => void) | undefined;
    let onActivity: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVisibility = () => {
        if (document.visibilityState === 'hidden') {
          lock('aba web oculta');
          void supabaseAuth.auth.signOut({ scope: 'local' });
        }
      };
      onActivity = () => activity();
      document.addEventListener('visibilitychange', onVisibility);
      document.addEventListener('pointerdown', onActivity);
      document.addEventListener('keydown', onActivity);
    }
    return () => {
      clearInterval(check);
      sub.remove();
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
      if (onActivity) {
        document.removeEventListener('pointerdown', onActivity);
        document.removeEventListener('keydown', onActivity);
      }
    };
  }, [activity, lock]);

  const onRemoteLogin = useCallback(async (email: string, password: string): Promise<string> => {
    const ticket = ++generationRef.current;
    try {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) throw new Error('O servidor não retornou sessão válida.');
      console.info('[FinanceiroMVP][sessao] Senha aceita; AppState:', stateRef.current);
      if (ticket !== generationRef.current || isAppInBackground()) return 'Entrada interrompida.';
      let enabled = false;
      if (isNativeQuickUnlock) enabled = (await getQuickUserId()) === data.session.user.id;
      if (ticket !== generationRef.current || isAppInBackground()) return 'Entrada interrompida.';
      allowSession(data.session, enabled);
      return '';
    } catch (e) {
      return e instanceof Error ? e.message : 'Login não realizado.';
    }
  }, [allowSession, isAppInBackground]);

  const onQuickLogin = useCallback(async (): Promise<string> => {
    if (!isNativeQuickUnlock) return 'Biometria disponível apenas no aplicativo instalado.';
    const ticket = ++generationRef.current;
    promptRef.current = true; // iOS pode emitir inactive durante o prompt.
    try {
      const stored = await readQuickCredential(); // prompt oficial do SO, token protegido.
      if (ticket !== generationRef.current || isAppInBackground()) return 'Entrada cancelada ao alternar aplicativo.';
      const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: stored.refreshToken });
      if (error) throw error;
      if (!data.session || data.session.user.id !== stored.userId) throw new Error('Conta diferente da credencial local.');
      if (ticket !== generationRef.current || isAppInBackground()) return 'Entrada cancelada.';
      // Atualizar refresh token rotativo. Pode solicitar segundo prompt nativo no Android.
      try { await updateQuickCredential(stored.userId, data.session.refresh_token); }
      catch { setNativeMessage('Atualização de credencial falhou; na próxima entrada use senha e reative.'); }
      if (ticket !== generationRef.current || isAppInBackground()) return 'Entrada cancelada.';
      allowSession(data.session, true);
      return '';
    } catch (e) {
      return e instanceof Error ? `${e.message} Use e-mail e senha.` : 'Biometria indisponível. Use e-mail e senha.';
    } finally {
      promptRef.current = false;
    }
  }, [allowSession, isAppInBackground]);

  const activateNative = useCallback(async () => {
    if (!isNativeQuickUnlock || nativeBusy || !approvedRef.current) return;
    const active = approvedRef.current;
    const ticket = generationRef.current;
    setNativeBusy(true);
    setNativeMessage('');
    promptRef.current = true;
    try {
      const check = await checkQuickUnlock();
      if (!check.ok) throw new Error(check.message);
      if (ticket !== generationRef.current || isAppInBackground()) return;
      // Não guardar senha. Só o token de atualização da sessão corrente.
      await enableQuickUnlock(active.user.id, active.refresh_token);
      if (ticket !== generationRef.current || isAppInBackground()) {
        await disableQuickUnlock(active.user.id);
        return;
      }
      setQuickUserId(active.user.id);
      setNativeEnabled(true);
      setNativeMessage('Entrada biométrica direta ativada neste aparelho.');
    } catch (e) {
      setNativeMessage(e instanceof Error ? e.message : 'Não foi possível ativar biometria.');
    } finally {
      promptRef.current = false;
      setNativeBusy(false);
    }
  }, [nativeBusy, isAppInBackground]);

  const deactivateNative = useCallback(async () => {
    if (!isNativeQuickUnlock || !approvedRef.current || nativeBusy) return;
    setNativeBusy(true);
    setNativeMessage('');
    try {
      const id = approvedRef.current.user.id;
      await disableQuickUnlock(id);
      if (quickUserId === id) setQuickUserId(null);
      setNativeEnabled(false);
      setNativeMessage('Entrada biométrica desativada neste aparelho.');
    } catch {
      setNativeEnabled(false);
      setNativeMessage('Não foi possível confirmar a remoção. Verifique o dispositivo.');
    } finally { setNativeBusy(false); }
  }, [nativeBusy, quickUserId]);

  if (!session) {
    return (
      <View style={styles.flex}>
        {banner ? <Text style={styles.banner}>{banner}</Text> : null}
        <LoginScreen hasQuickAccount={Boolean(quickUserId)} onQuickLogin={onQuickLogin} onRemoteLogin={onRemoteLogin} />
      </View>
    );
  }

  return (
    <ProfileSessionContext.Provider value={{
      session, signOut, lock, nativeEnabled, nativeBusy, nativeMessage, activateNative, deactivateNative,
    }}>
      <View style={styles.flex} onTouchStart={activity}>{children}</View>
    </ProfileSessionContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0, backgroundColor: '#0B1220' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18 },
  panel: { width: '100%', maxWidth: 410, padding: 22, gap: 12, backgroundColor: '#142136', borderRadius: 18, borderWidth: 1, borderColor: '#34435B' },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 17, color: '#CBD5E1', fontWeight: '700' },
  hint: { color: '#94A3B8', textAlign: 'center', fontSize: 13 },
  input: { backgroundColor: '#1B2A40', color: '#FFFFFF', borderColor: '#475569', borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16 },
  message: { color: '#FCA5A5', fontSize: 13 },
  primary: { backgroundColor: '#7C3AED', borderRadius: 12, alignItems: 'center', padding: 13 },
  quickButton: { backgroundColor: '#5B21B6', borderRadius: 12, alignItems: 'center', padding: 15 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondary: { alignItems: 'center', padding: 8 },
  link: { color: '#C4B5FD', fontWeight: '700' },
  disabled: { opacity: .55 },
  banner: { color: '#DDD6FE', textAlign: 'center', padding: 10 },
});
