import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  AppState,
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { authConfigured, supabaseAuth } from '../../auth/supabaseClient';

const IDLE_MS = 15 * 60 * 1000;

function LoginScreen() {
  const [cadastro, setCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [busy, setBusy] = useState(false);
  const [mensagem, setMensagem] = useState('');

  async function entrar() {
    if (!authConfigured) {
      setMensagem('Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
      return;
    }
    if (!email.includes('@') || senha.length < 6 || (cadastro && !nome.trim())) {
      setMensagem('Informe e-mail, senha de pelo menos 6 caracteres e, no cadastro, nome.');
      return;
    }
    setBusy(true);
    setMensagem('');
    try {
      if (cadastro) {
        const { data, error } = await supabaseAuth.auth.signUp({
          email: email.trim().toLowerCase(),
          password: senha,
          options: { data: { full_name: nome.trim() } },
        });
        if (error) throw error;
        if (!data.session) setMensagem('Cadastro solicitado. Confira seu e-mail para confirmar a conta e depois entre.');
      } else {
        const { error } = await supabaseAuth.auth.signInWithPassword({
          email: email.trim().toLowerCase(), password: senha,
        });
        if (error) throw error;
      }
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : 'Não foi possível autenticar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.center}>
      <View style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">FinanMVP</Text>
        <Text style={styles.subtitle}>{cadastro ? 'Criar uma conta' : 'Entrar na conta'}</Text>
        {cadastro && (
          <TextInput style={styles.input} accessibilityLabel="Nome do usuário" placeholder="Nome" value={nome}
            onChangeText={setNome} autoCapitalize="words" />
        )}
        <TextInput style={styles.input} accessibilityLabel="E-mail" placeholder="E-mail" value={email}
          onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <TextInput style={styles.input} accessibilityLabel="Senha" placeholder="Senha" value={senha}
          onChangeText={setSenha} secureTextEntry autoComplete={cadastro ? 'new-password' : 'current-password'} />
        {mensagem ? <Text style={styles.message} accessibilityLiveRegion="polite">{mensagem}</Text> : null}
        <Pressable accessibilityRole="button" style={styles.primary} onPress={() => void entrar()} disabled={busy}>
          <Text style={styles.primaryText}>{busy ? 'Processando...' : cadastro ? 'Criar conta' : 'Entrar'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => { setCadastro(!cadastro); setMensagem(''); }}>
          <Text style={styles.link}>{cadastro ? 'Já tenho uma conta' : 'Ainda não tenho conta'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Compartilha o usuário conectado com o cabeçalho financeiro.
type ProfileSessionValue = { session: Session; signOut: () => Promise<void> };
const ProfileSessionContext = createContext<ProfileSessionValue | null>(null);

export function useProfileSession() {
  return useContext(ProfileSessionContext);
}

/** Mostra dados financeiros apenas durante a sessão ativa. */
export function ProtectedFinance({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const lastActivity = useRef(Date.now());
  const [expiredMessage, setExpiredMessage] = useState('');

  const signOut = useCallback(async () => {
    // persistSession=false: a sessão é apenas em memória e desaparece ao reiniciar.
    const { error } = await supabaseAuth.auth.signOut({ scope: 'local' });
    if (error) console.warn('Erro ao sair:', error.message);
    setSession(null); // Bloqueio local imediato, inclusive com erro de rede.
  }, []);

  const activity = useCallback(() => { lastActivity.current = Date.now(); }, []);

  useEffect(() => {
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((_event, current) => {
      lastActivity.current = Date.now();
      setSession(current);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    activity();
    const check = setInterval(() => {
      if (Date.now() - lastActivity.current >= IDLE_MS) {
        setExpiredMessage('Sessão encerrada após 15 minutos sem atividade.');
        void signOut();
      }
    }, 5_000);
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        setExpiredMessage('Por segurança, entre novamente ao retornar ao aplicativo.');
        void signOut();
      } else if (Date.now() - lastActivity.current >= IDLE_MS) {
        setExpiredMessage('Sessão expirada. Entre novamente.');
        void signOut();
      }
    });

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onHidden = () => {
        if (document.visibilityState === 'hidden') {
          setExpiredMessage('O acesso foi encerrado ao sair da página.');
          void signOut();
        }
      };
      document.addEventListener('visibilitychange', onHidden);
      document.addEventListener('pointerdown', activity);
      document.addEventListener('keydown', activity);
      return () => {
        clearInterval(check); sub.remove();
        document.removeEventListener('visibilitychange', onHidden);
        document.removeEventListener('pointerdown', activity);
        document.removeEventListener('keydown', activity);
      };
    }
    return () => { clearInterval(check); sub.remove(); };
  }, [session, signOut, activity]);

  if (!session) return (
    <View style={styles.flex}>
      {expiredMessage ? <Text style={styles.expired}>{expiredMessage}</Text> : null}
      <LoginScreen />
    </View>
  );

  return (
    <ProfileSessionContext.Provider value={{ session, signOut }}>
      <View style={styles.flex} onTouchStart={activity}>
        {children}
      </View>
    </ProfileSessionContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0, backgroundColor: '#0B1220' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18 },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 22, gap: 12, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 28, fontWeight: '800', color: '#5B21B6' },
  subtitle: { fontSize: 17, color: '#374151', fontWeight: '700' },
  input: { backgroundColor: '#FFFFFF', color: '#111827', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16 },
  message: { color: '#B91C1C', fontSize: 13 },
  primary: { backgroundColor: '#7C3AED', borderRadius: 12, alignItems: 'center', padding: 13 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondary: { alignItems: 'center', padding: 8 },
  link: { color: '#5B21B6', fontWeight: '700' },
  expired: { textAlign: 'center', color: '#991B1B', paddingTop: 14, fontWeight: '600' },
});
