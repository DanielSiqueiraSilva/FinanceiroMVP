import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type PropsWithChildren,
} from 'react';
import {
  AppState, Platform, ScrollView, StyleSheet,
  Text, TextInput, View, useWindowDimensions, type ViewStyle,
} from 'react-native';
import { OceanPressable as Pressable } from '../../design/OceanControls';
import type { Session } from '@supabase/supabase-js';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { BrandMark } from '../../design/brand';
import { OceanGlass } from '../../design/OceanGlass';
import { OceanButton } from '../../design/OceanControls';
import { OCEAFIN, getOceafinTheme } from '../../design/tokens';
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


  const { width, height } = useWindowDimensions();
  const { reduceMotion, highContrast } = useAccessibility();
  const [showPassword, setShowPassword] = useState(false);
  const cardFrameRef = useRef<View>(null);
  const cardGlowRef = useRef<View>(null);
  const desktop = width >= 900;
  const ui = useAccessibleStyles(styles);
  const lightText = !isDark;
  const ink = isDark ? '#EBFAFD' : '#173746';
  const secondaryInk = isDark ? '#AFCBD3' : '#617B88';
  const oceanLink = isDark ? '#94E4E1' : '#116A7B';
  const fieldFill = isDark ? 'rgba(143,207,226,0.10)' : 'rgba(255,255,255,0.55)';
  const fieldBorder = isDark ? 'rgba(161,224,237,0.29)' : 'rgba(67,127,144,0.29)';
  const cardFill = highContrast ? (isDark ? '#142F3E' : '#FFFFFF') :
    isDark ? 'rgba(112,179,197,0.14)' : 'rgba(255,255,255,0.49)';
  const cardBorder = isDark ? 'rgba(172,229,237,0.34)' : 'rgba(255,255,255,0.90)';
  const cardWeb = Platform.OS === 'web' ? ({
    ...(!highContrast ? {
      backdropFilter: 'blur(27px) saturate(140%)',
      WebkitBackdropFilter: 'blur(27px) saturate(140%)',
    } : {}),
    boxShadow: isDark
      ? 'inset 0 1px rgba(255,255,255,.17),0 19px 46px rgba(0,10,20,.20)'
      : 'inset 0 1px rgba(255,255,255,.75),inset 0 -1px rgba(255,255,255,.20),0 19px 46px rgba(31,83,98,.12)',
  } as unknown as ViewStyle) : undefined;

  // A luz do cartão responde apenas ao ponteiro; o formulário permanece estático.
  // O fallback nativo é completamente funcional sem eventos do navegador.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || highContrast) return;
    const target = cardFrameRef.current as unknown as HTMLElement | null;
    const light = cardGlowRef.current as unknown as HTMLElement | null;
    if (!target || !light) return;
    const reduced = reduceMotion || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const r = target.getBoundingClientRect();
      const x = ((event.clientX - r.left) / r.width * 100).toFixed(1);
      const y = ((event.clientY - r.top) / r.height * 100).toFixed(1);
      light.style.backgroundImage =
        'radial-gradient(circle at ' + x + '% ' + y + '%, ' +
        (isDark ? 'rgba(153,243,238,.12)' : 'rgba(255,255,255,.43)') +
        ', transparent 48%)';
    };
    const enter = (event: PointerEvent) => {
      if (!reduced && event.pointerType !== 'touch') {
        target.style.transform = 'translateY(-3px)';
      }
    };
    const leave = () => {
      target.style.transform = 'translateY(0)';
      light.style.backgroundImage = '';
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerenter', enter);
    target.addEventListener('pointerleave', leave);
    return () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerenter', enter);
      target.removeEventListener('pointerleave', leave);
    };
  }, [isDark, highContrast, reduceMotion]);

  return (
    <ScrollView
      style={[ui.loginBackground, { backgroundColor: isDark ? '#0D2534' : '#E6EFF2' }]}
      contentContainerStyle={[
        ui.loginScroll, !desktop && ui.loginScrollMobile,
        { minHeight: Math.max(height, 600) },
      ]}
      keyboardShouldPersistTaps="handled"
      testID="oceafin-login-page"
    >
      <View testID="oceafin-login-split" style={[
        ui.loginShell, desktop ? ui.loginShellDesktop : ui.loginShellMobile,
        { minHeight: desktop ? Math.max(630, height - 60) : Math.max(620, height - 28) },
      ]}>
        <View testID="oceafin-login-brand-panel" style={[
          ui.loginBrandPanel, !desktop && ui.loginBrandHidden,
        ]}>
          <View pointerEvents="none" style={ui.loginGradient}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="oceafin-login-brand-gradient" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#0A2838" />
                  <Stop offset="0.65" stopColor="#0E3445" />
                  <Stop offset="1" stopColor="#17495A" />
                </LinearGradient>
              </Defs>
              <Rect width="100" height="100" fill="url(#oceafin-login-brand-gradient)" />
            </Svg>
          </View>
          <View style={ui.leftBrand}>
            <BrandMark size={39} tile={false}/>
            <Text style={ui.leftBrandName}>{OCEAFIN.name}</Text>
          </View>
          <View style={ui.brandMessage}>
            <Text style={ui.brandEyebrow}>BEM-VINDO À OCEAFIN</Text>
            <Text accessibilityRole="header" style={ui.brandHeadline}>
              Suas finanças,{"\n"}
              <Text style={ui.brandHeadlineAccent}>mais simples.</Text>
            </Text>
            <Text style={ui.brandDescription}>
              Organize seu presente, planeje o futuro e tenha mais clareza para suas decisões financeiras.
            </Text>
          </View>
          <View style={ui.leftFooter}>
            <View style={ui.footerDot}/>
            <Text style={ui.leftFooterText}>Um lugar para cuidar do que importa.</Text>
          </View>
        </View>

        <View style={[ui.loginRight, {
          backgroundColor: isDark ? '#102B3A' : '#DDECF0',
        }]}>
          <View pointerEvents="none" style={ui.loginGradient}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="oceafin-login-surface-gradient" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={isDark ? '#142E3D' : '#E6F1F3'} />
                  <Stop offset="0.85" stopColor={isDark ? '#0D2534' : '#C9E1E7'} />
                  <Stop offset="1" stopColor={isDark ? '#102B3B' : '#E0EFF0'} />
                </LinearGradient>
              </Defs>
              <Rect width="100" height="100" fill="url(#oceafin-login-surface-gradient)" />
            </Svg>
          </View>
          <View ref={cardFrameRef} style={[ui.cardFrame, Platform.OS === 'web' &&
            ({ transition: reduceMotion ? 'none' : 'transform 380ms ease' } as unknown as ViewStyle)]}>
            <OceanGlass material="floating" radius={26}
              style={[ui.loginCard, {
                backgroundColor: cardFill, borderColor: cardBorder,
              }, cardWeb]}
              testID="oceafin-login-glass">
              {!highContrast && <View ref={cardGlowRef} pointerEvents="none"
                style={ui.cardPointerLight} />}
              <View pointerEvents="none" style={[
                ui.cardTopGlint,
                { backgroundColor: isDark ? 'rgba(200,251,248,.33)' : 'rgba(255,255,255,.86)' },
              ]}/>

              <View style={ui.cardBrand}>
                <BrandMark size={28} tile={false}/>
                <Text style={[ui.cardBrandName, { color: ink }]}>{OCEAFIN.name}</Text>
              </View>
              <View style={ui.cardIntro}>
                <Text accessibilityRole="header" style={[ui.cardHeading, { color: ink }]}>
                  {cadastro ? 'Comece sua jornada.' : 'Bem-vindo de volta.'}
                </Text>
                <Text style={[ui.cardSubtitle, { color: secondaryInk }]}>
                  {cadastro
                    ? 'Crie sua conta e organize suas finanças com clareza.'
                    : 'Entre para continuar cuidando das suas finanças.'}
                </Text>
              </View>

              <View style={ui.form}>
                {cadastro && <View style={ui.field}>
                  <Text style={[ui.fieldLabel, { color: ink }]}>Seu nome</Text>
                  <TextInput
                    testID="oceafin-login-name"
                    style={[ui.input, { color: ink, backgroundColor: fieldFill, borderColor: fieldBorder }]}
                    placeholder="Como podemos chamar você?"
                    placeholderTextColor={secondaryInk}
                    value={nome} onChangeText={setNome}
                    accessibilityLabel="Seu nome"
                    autoCapitalize="words" autoComplete="name"
                  />
                </View>}
                <View style={ui.field}>
                  <Text style={[ui.fieldLabel, { color: ink }]}>E-mail</Text>
                  <TextInput
                    testID="oceafin-login-email"
                    style={[ui.input, { color: ink, backgroundColor: fieldFill, borderColor: fieldBorder }]}
                    placeholder="seuemail@exemplo.com" placeholderTextColor={secondaryInk}
                    value={email} onChangeText={setEmail}
                    accessibilityLabel="E-mail"
                    autoCapitalize="none" keyboardType="email-address" autoComplete="email"
                  />
                </View>
                <View style={ui.field}>
                  <Text style={[ui.fieldLabel, { color: ink }]}>Senha</Text>
                  <View style={ui.passwordInputArea}>
                    <TextInput
                      testID="oceafin-login-password"
                      style={[ui.input, ui.passwordInput, {
                        color: ink, backgroundColor: fieldFill, borderColor: fieldBorder,
                      }]}
                      placeholder="Sua senha" placeholderTextColor={secondaryInk}
                      value={senha} onChangeText={setSenha}
                      accessibilityLabel="Senha"
                      secureTextEntry={!showPassword}
                      autoComplete={cadastro ? 'new-password' : 'current-password'}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      oceanTone="none"
                      style={ui.passwordVisibility}
                      onPress={() => setShowPassword(!showPassword)}>
                      <Text style={[ui.showText, { color: oceanLink }]}>
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={ui.primaryAction}>
                  <OceanButton variant="primary" fullWidth loading={busy}
                    label={cadastro ? 'Criar minha conta' : 'Entrar na Oceafin'}
                    onPress={() => void login(false)} />
                </View>
              </View>

              {!cadastro && (Platform.OS === 'web' || (isNativeQuickUnlock && hasQuickAccount)) && (
                <View style={ui.quickLoginArea}>
                  <View style={ui.dividerRow}>
                    <View style={[ui.dividerLine, { backgroundColor: fieldBorder }]}/>
                    <Text style={[ui.dividerText, { color: secondaryInk }]}>ou</Text>
                    <View style={[ui.dividerLine, { backgroundColor: fieldBorder }]}/>
                  </View>
                  {Platform.OS === 'web' ? (
                    <OceanButton variant="glass" fullWidth loading={busy}
                      label="Entrar com chave de acesso"
                      accessibilityHint="Usa uma chave segura deste dispositivo quando disponível"
                      onPress={() => void login(false, true)}/>
                  ) : (
                    <OceanButton variant="glass" fullWidth loading={busy}
                      label="Entrar com biometria"
                      onPress={() => void login(true)}/>
                  )}
                </View>
              )}

              <View style={ui.registerRow}>
                <Text style={[ui.registerPrompt, { color: secondaryInk }]}>
                  {cadastro ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}
                </Text>
                <Pressable accessibilityRole="button" oceanTone="none" disabled={busy}
                  accessibilityLabel={cadastro ? 'Entrar na conta existente' : 'Criar conta'}
                  onPress={() => {
                    setCadastro(!cadastro);
                    setMensagem('');
                    setShowPassword(false);
                  }}
                  style={ui.registerButton}>
                  <Text style={[ui.registerLink, { color: oceanLink }]}>
                    {cadastro ? 'Entrar' : 'Criar conta'}
                  </Text>
                </Pressable>
              </View>
              <View style={[ui.safeFooter, { borderTopColor: fieldBorder }]}>
                <Text style={[ui.safeFooterIcon, { color: oceanLink }]}>◇</Text>
                <Text style={[ui.safeFooterText, { color: secondaryInk }]}>
                  Acesso protegido para sua tranquilidade.
                </Text>
              </View>
              {!!mensagem && <Text style={[ui.message, {
                color: isDark ? '#FFD0CB' : '#8C3443',
              }]} accessibilityLiveRegion="polite">{mensagem}</Text>}
            </OceanGlass>
          </View>
        </View>
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
      <View style={[styles.flex, { backgroundColor: getOceafinTheme(isDark).page }]}>
        {banner ? <Text style={styles.banner}>{banner}</Text> : null}
        <LoginScreen hasQuickAccount={Boolean(quickUserId)} onQuickLogin={onQuickLogin} onRemoteLogin={onRemoteLogin} onPasskeyLogin={onPasskeyLogin} />
      </View>
    );
  }

  return (
    <ProfileSessionContext.Provider value={{
      session, signOut, lock, nativeEnabled, nativeBusy, nativeMessage, activateNative, deactivateNative, runPasskeyOperation,
    }}>
      <View style={[styles.flex, { backgroundColor: getOceafinTheme(isDark).page }]} onTouchStart={activity}>{children}</View>
    </ProfileSessionContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0, backgroundColor: '#0D1C29' },
  loginBackground: { flex: 1, backgroundColor: '#E6EFF2' },
  loginScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    paddingVertical: 18, paddingHorizontal: 16 },
  loginScrollMobile: { paddingVertical: 12, paddingHorizontal: 12 },
  loginShell: { width: '100%', overflow: 'hidden',
    borderRadius: 22, borderWidth: 1, borderColor: 'rgba(111,160,174,.18)',
    backgroundColor: '#E6F1F3' },
  loginShellDesktop: { maxWidth: 1440, flexDirection: 'row' },
  loginShellMobile: { maxWidth: 430, flexDirection: 'column', borderRadius: 27 },
  loginBrandPanel: { width: '46%', minWidth: 0, overflow: 'hidden',
    paddingHorizontal: 41, paddingVertical: 38,
    justifyContent: 'space-between', backgroundColor: '#0A2838' },
  loginBrandHidden: { display: 'none' },
  loginGradient: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  leftBrand: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  leftBrandName: { fontSize: 23, fontWeight: '800', color: '#F0FBFC',
    fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined, letterSpacing: -0.8 },
  brandMessage: { gap: 0, maxWidth: 420 },
  brandEyebrow: { color: '#85D1D3', fontWeight: '800',
    fontSize: 11, letterSpacing: 2, marginBottom: 20 },
  brandHeadline: { color: '#F0FBFC', fontWeight: '800', fontSize: 43,
    lineHeight: 51, letterSpacing: -1.4,
    fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined },
  brandHeadlineAccent: { color: '#90DEDB' },
  brandDescription: { color: '#B0CBD4', lineHeight: 23, fontSize: 14,
    marginTop: 18, maxWidth: 320 },
  leftFooter: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  footerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#71D7D2' },
  leftFooterText: { color: '#98BAC6', fontSize: 11 },
  loginRight: { flex: 1, minWidth: 0, justifyContent: 'center',
    alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, overflow: 'hidden' },
  cardFrame: { width: '100%', maxWidth: 402, alignSelf: 'center' },
  loginCard: { width: '100%', paddingHorizontal: 29, paddingVertical: 30,
    borderRadius: 26, gap: 0, overflow: 'hidden' },
  cardPointerLight: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cardTopGlint: { position: 'absolute', top: 0, left: 28, right: 28, height: 1 },
  cardBrand: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 23 },
  cardBrandName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5,
    fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined },
  cardIntro: { marginBottom: 22 },
  cardHeading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.65,
    fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined, lineHeight: 33 },
  cardSubtitle: { fontSize: 13, lineHeight: 21, marginTop: 7 },
  form: { gap: 13 },
  field: { gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: '700' },
  input: { minHeight: 46, width: '100%', paddingHorizontal: 13,
    borderWidth: 1, borderRadius: 12, fontSize: 15 },
  passwordInputArea: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 75 },
  passwordVisibility: { position: 'absolute', top: 0, right: 2, bottom: 0,
    justifyContent: 'center', alignItems: 'center', minWidth: 66, minHeight: 44 },
  showText: { fontSize: 12, fontWeight: '750' },
  primaryAction: { paddingTop: 5 },
  quickLoginArea: { gap: 11, paddingTop: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11 },
  registerRow: { flexDirection: 'row', justifyContent: 'center',
    gap: 5, flexWrap: 'wrap', alignItems: 'center', paddingTop: 20 },
  registerPrompt: { fontSize: 12, lineHeight: 22 },
  registerButton: { minHeight: 44, justifyContent: 'center',
    paddingHorizontal: 4 },
  registerLink: { fontSize: 12, fontWeight: '800' },
  safeFooter: { marginTop: 14, paddingTop: 14, borderTopWidth: 1,
    flexDirection: 'row', gap: 7, alignItems: 'center' },
  safeFooterIcon: { fontSize: 18 },
  safeFooterText: { fontSize: 11, lineHeight: 18, flexShrink: 1 },
  message: { fontSize: 12, lineHeight: 19, marginTop: 14 },
  banner: { color: '#BDDCE4', textAlign: 'center', padding: 10 },
});