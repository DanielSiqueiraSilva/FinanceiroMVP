import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type PropsWithChildren,
} from 'react';
import {
  AppState, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
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
  runPasskeyOperation: <T>(operation: () => Promise<T>) => Promise<T>;
};
const ProfileSessionContext = createContext<ProfileSessionValue | null>(null);
export function useProfileSession() { return useContext(ProfileSessionContext); }

type LoginProps = {
  hasQuickAccount: boolean;
  onQuickLogin: () => Promise<string>;
  onRemoteLogin: (email: string, password: string) => Promise<string>;
  onPasskeyLogin: () => Promise<string>;
};
function LoginScreen({ hasQuickAccount, onQuickLogin, onRemoteLogin, onPasskeyLogin }: LoginProps) {
  const { isDark } = useAccessibility();
  const [cadastro, setCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [busy, setBusy] = useState(false);
  const [mensagem, setMensagem] = useState('');

  async function login(byQuick: boolean, byPasskey = false) {
    if (busy) return;
    if (!authConfigured) {
      setMensagem('Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
      return;
    }
    if (!byQuick && !byPasskey && (!email.includes('@') || senha.length < 6 || (cadastro && !nome.trim()))) {
      setMensagem('Informe e-mail, senha de pelo menos 6 caracteres e nome no cadastro.');
      return;
    }
    setBusy(true);
    setMensagem('');
    try {
      if (byPasskey) {
        setMensagem(await onPasskeyLogin());
      } else if (byQuick) {
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


  const ui = useAccessibleStyles(styles);

  return (
    <ScrollView
      style={[ui.loginBackground, !isDark && lightLoginStyles.loginBackground]}
      contentContainerStyle={ui.loginScroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[ui.panel, !isDark && lightLoginStyles.panel]}>
        <View style={ui.brand}>
          <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
            <Rect x={3} y={6} width={18} height={15} rx={3} stroke={isDark ? "#C4B5FD" : "#6D28D9"} strokeWidth={1.7} />
            <Path d="M6 6V4.5A2.5 2.5 0 0 1 8.5 2H19" stroke={isDark ? "#C4B5FD" : "#6D28D9"} strokeWidth={1.7} strokeLinecap="round" />
            <Path d="M15.5 12h5.5v4h-5.5a2 2 0 0 1 0-4Z" stroke={isDark ? "#C4B5FD" : "#6D28D9"} strokeWidth={1.7} />
          </Svg>
          <Text accessibilityRole="header" style={[ui.brandTitle, !isDark && lightLoginStyles.brandTitle]}>FinanMVP</Text>
        </View>

        <Text style={[ui.subtitle, !isDark && lightLoginStyles.subtitle]}>{cadastro ? 'Crie sua conta com segurança' : 'Entre na sua conta com segurança'}</Text>

        {!cadastro ? (
          <View style={ui.faceArea}>
            <Svg width={52} height={52} viewBox="0 0 48 48" fill="none" accessibilityLabel="Ícone de reconhecimento facial">
              <Path d="M16 8h-4a4 4 0 0 0-4 4v4M32 8h4a4 4 0 0 1 4 4v4M8 32v4a4 4 0 0 0 4 4h4M40 32v4a4 4 0 0 1-4 4h-4" stroke={isDark ? "#C4B5FD" : "#6D28D9"} strokeWidth={2.8} strokeLinecap="round" />
              <Circle cx={18} cy={22} r={1.6} fill={isDark ? "#C4B5FD" : "#6D28D9"} />
              <Circle cx={30} cy={22} r={1.6} fill={isDark ? "#C4B5FD" : "#6D28D9"} />
              <Path d="M18 31c3.3 3.5 8.7 3.5 12 0" stroke={isDark ? "#C4B5FD" : "#6D28D9"} strokeWidth={2.6} strokeLinecap="round" />
            </Svg>
          </View>
        ) : null}

        {!cadastro && Platform.OS === 'web' ? (
          <Pressable
            style={[ui.quickButton, busy && ui.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Entrar com chave de acesso, Face ID ou impressão digital"
            disabled={busy}
            onPress={() => void login(false, true)}
          >
            <Text style={ui.primaryText}>◉  {busy ? 'Verificando...' : 'Entrar com biometria'}</Text>
          </Pressable>
        ) : null}
        {!cadastro && isNativeQuickUnlock && hasQuickAccount ? (
          <Pressable
            style={[ui.quickButton, busy && ui.disabled]}
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void login(true)}
          >
            <Text style={ui.primaryText}>{busy ? 'Verificando...' : 'Entrar com biometria'}</Text>
          </Pressable>
        ) : null}

        <View style={ui.emailSection}>
          <Text style={[ui.emailTitle, !isDark && lightLoginStyles.emailTitle]}>{cadastro ? 'Dados para criar sua conta' : 'Ou entre com e-mail e senha'}</Text>
          {cadastro ? (
            <TextInput
              style={[ui.input, !isDark && lightLoginStyles.input]}
              placeholder="Nome completo"
              placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
              value={nome}
              onChangeText={setNome}
              accessibilityLabel="Nome completo"
              autoCapitalize="words"
              autoComplete="name"
            />
          ) : null}
          <TextInput
            style={[ui.input, !isDark && lightLoginStyles.input]}
            placeholder="E-mail"
            placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={[ui.input, !isDark && lightLoginStyles.input]}
            placeholder="Senha"
            placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
            value={senha}
            onChangeText={setSenha}
            accessibilityLabel="Senha"
            secureTextEntry
            autoComplete={cadastro ? 'new-password' : 'current-password'}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={[ui.passwordButton, !isDark && lightLoginStyles.passwordButton, busy && ui.disabled]}
            onPress={() => void login(false)}
          >
            <Text style={[ui.passwordText, !isDark && lightLoginStyles.passwordText]}>
              {busy ? 'Verificando...' : cadastro ? 'Criar conta' : 'Entrar com e-mail e senha'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={ui.secondary}
          onPress={() => { setCadastro(!cadastro); setMensagem(''); }}
        >
          <Text style={ui.link}>{cadastro ? 'Já tem conta? Entrar' : 'Ainda não tem conta? Criar conta'}</Text>
        </Pressable>

        {mensagem ? <Text style={[ui.message, !isDark && lightLoginStyles.message]} accessibilityLiveRegion="polite">{mensagem}</Text> : null}
        {!cadastro ? (
          <Text style={[ui.hint, !isDark && lightLoginStyles.hint]}>Face ID, impressão digital ou método seguro disponível no dispositivo</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** O estado remoto do Supabase NÃO abre a tela: somente allowSession faz isso. */
export function ProtectedFinance({ children }: PropsWithChildren) {
  const { isDark } = useAccessibility();
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
  const passkeyPromptRef = useRef(false);
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
  // Evita confundir o diálogo WebAuthn com saída intencional do site.
  const runPasskeyOperation = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    passkeyPromptRef.current = true;
    try {
      return await operation();
    } finally {
      passkeyPromptRef.current = false;
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        // Não liberar uma sessão se o usuário deixou a aba durante o diálogo.
        lock('aba oculta apos dialogo de passkey');
        void supabaseAuth.auth.signOut({ scope: 'local' });
      }
    }
  }, [lock]);


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
        if (document.visibilityState === 'hidden' && !passkeyPromptRef.current) {
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

  const onPasskeyLogin = useCallback(async (): Promise<string> => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.isSecureContext || typeof PublicKeyCredential === 'undefined') {
      return 'Chaves de acesso exigem navegador compatível e HTTPS.';
    }
    const ticket = ++generationRef.current;
    try {
      const result = await runPasskeyOperation(() => supabaseAuth.auth.signInWithPasskey());
      if (result.error) throw result.error;
      if (!result.data?.session) throw new Error('Não foi possível validar a chave de acesso.');
      if (ticket !== generationRef.current || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) {
        return 'Entrada interrompida.';
      }
      allowSession(result.data.session, false);
      return '';
    } catch (e) {
      return e instanceof Error ? e.message : 'Falha ao entrar com chave de acesso. Use e-mail e senha.';
    }
  }, [allowSession, runPasskeyOperation]);

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
      <View style={[styles.flex, { backgroundColor: isDark ? "#0B1220" : "#F7F5FA" }]}>
        {banner ? <Text style={styles.banner}>{banner}</Text> : null}
        <LoginScreen hasQuickAccount={Boolean(quickUserId)} onQuickLogin={onQuickLogin} onRemoteLogin={onRemoteLogin} onPasskeyLogin={onPasskeyLogin} />
      </View>
    );
  }

  return (
    <ProfileSessionContext.Provider value={{
      session, signOut, lock, nativeEnabled, nativeBusy, nativeMessage, activateNative, deactivateNative, runPasskeyOperation,
    }}>
      <View style={[styles.flex, { backgroundColor: isDark ? "#0B1220" : "#F7F5FA" }]} onTouchStart={activity}>{children}</View>
    </ProfileSessionContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0, backgroundColor: '#0B1220' },
  loginBackground: { flex: 1, backgroundColor: '#090F1B' },
  loginScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 34, paddingHorizontal: 16 },
  panel: {
    width: '100%', maxWidth: 510, borderRadius: 20, padding: 24, gap: 16,
    backgroundColor: '#111A2E', borderWidth: 1, borderColor: '#283650',
  },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  brandTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 14, textAlign: 'center', marginTop: 0 },
  faceArea: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  quickButton: {
    backgroundColor: '#7C3AED', borderRadius: 13, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 16, minHeight: 54,
  },
  primaryText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  emailSection: { gap: 10, paddingTop: 4 },
  emailTitle: { color: '#CBD5E1', textAlign: 'center', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: '#18263D', color: '#FFFFFF', borderColor: '#44516A',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, fontSize: 16,
  },
  passwordButton: {
    borderColor: '#475569', borderWidth: 1, borderRadius: 12, minHeight: 52,
    alignItems: 'center', justifyContent: 'center', padding: 12,
  },
  passwordText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  secondary: { alignItems: 'center', paddingVertical: 9 },
  link: { color: '#C4B5FD', fontWeight: '700', fontSize: 14 },
  hint: { color: '#94A3B8', textAlign: 'center', fontSize: 12, lineHeight: 18 },
  message: { color: '#FCA5A5', textAlign: 'center', fontSize: 13 },
  disabled: { opacity: .55 },
  banner: { color: '#DDD6FE', textAlign: 'center', padding: 10 },
});

/** O login usa base escura conforme a referência; estas sobreposições
 * garantem contraste real quando o usuário escolhe "Claro" no Aa. */
const lightLoginStyles = StyleSheet.create({
  loginBackground: { backgroundColor: '#F7F5FA' },
  panel: { backgroundColor: '#FFFFFF', borderColor: '#DDD6E6' },
  brandTitle: { color: '#111827' },
  subtitle: { color: '#374151' },
  emailTitle: { color: '#374151' },
  input: { backgroundColor: '#FCFBFD', borderColor: '#D8D2E2', color: '#111827' },
  passwordButton: { backgroundColor: '#FFFFFF', borderColor: '#8B5CF6' },
  passwordText: { color: '#5B21B6' },
  hint: { color: '#4B5563' },
  message: { color: '#991B1B' },
});
