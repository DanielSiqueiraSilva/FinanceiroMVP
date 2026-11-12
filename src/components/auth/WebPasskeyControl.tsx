import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { OceanPressable as Pressable } from '../../design/OceanControls';
import { supabaseAuth } from '../../auth/supabaseClient';
import { useProfileSession } from './ProtectedFinance';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';

type PasskeyInfo = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

export function WebPasskeyControl() {
  const auth = useProfileSession();
  const { isDark } = useAccessibility();
  const styles = useAccessibleStyles(baseStyles);
  const [keys, setKeys] = useState<PasskeyInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const { data, error } = await supabaseAuth.auth.passkey.list();
    if (error) throw error;
    setKeys(data ?? []);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !auth) return;
    let mounted = true;
    supabaseAuth.auth.passkey.list()
      .then(({ data, error }) => {
        if (error) throw error;
        if (mounted) setKeys(data ?? []);
      })
      .catch((e: unknown) => {
        if (mounted) setMessage(e instanceof Error ? e.message : 'Não foi possível consultar as chaves de acesso.');
      });
    return () => { mounted = false; };
  }, [auth?.session.user.id]);

  if (Platform.OS !== 'web' || !auth) return null;

  const supported = typeof window !== 'undefined' && window.isSecureContext && typeof PublicKeyCredential !== 'undefined';

  async function register() {
    if (!auth || busy || !supported) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await auth.runPasskeyOperation(() => supabaseAuth.auth.registerPasskey());
      if (error) throw error;
      await refresh();
      setMessage('Chave de acesso cadastrada. Você poderá entrar usando Face ID, digital ou método seguro do dispositivo.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível cadastrar a chave de acesso.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(passkeyId: string) {
    if (busy || typeof window === 'undefined' || !window.confirm('Deseja remover esta chave de acesso?')) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabaseAuth.auth.passkey.delete({ passkeyId });
      if (error) throw error;
      await refresh();
      setMessage('Chave de acesso removida.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível remover a chave.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, !isDark && lightPasskey.container]}>
      <Text style={[styles.heading, !isDark && lightPasskey.heading]}>Chaves de acesso</Text>
      <Text style={[styles.help, !isDark && lightPasskey.help]}>Cadastre uma chave depois de entrar com senha. A biometria é verificada pelo dispositivo, não pelo FinanceiroMVP.</Text>
      <Pressable accessibilityRole="button" disabled={busy || !supported} style={[styles.button, (!supported || busy) && styles.disabled]} onPress={() => void register()}>
        <Text style={styles.buttonText}>{busy ? 'Verificando...' : 'Ativar Face ID / digital neste dispositivo'}</Text>
      </Pressable>
      {!supported ? <Text style={styles.help}>Disponível em navegador compatível com WebAuthn e conexão HTTPS.</Text> : null}
      {keys.map(key => (
        <View key={key.id} style={styles.key}>
          <Text style={[styles.keyName, !isDark && lightPasskey.keyName]}>{key.friendly_name || 'Chave de acesso'} · {new Date(key.created_at).toLocaleDateString('pt-BR')}</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void remove(key.id)}>
            <Text style={[styles.remove, !isDark && lightPasskey.remove]}>Remover</Text>
          </Pressable>
        </View>
      ))}
      {message ? <Text style={[styles.message, !isDark && lightPasskey.message]} accessibilityLiveRegion="polite">{message}</Text> : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: { width: '100%', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#34435B' },
  heading: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  help: { color: '#A9B8D1', fontSize: 12 },
  button: { alignSelf: 'flex-start', backgroundColor: '#5B21B6', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: .5 },
  key: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  keyName: { color: '#DDD6FE', fontSize: 12 },
  remove: { color: '#FDA4AF', fontWeight: '700', fontSize: 12 },
  message: { color: '#DDD6FE', fontSize: 12 },
});

const lightPasskey = StyleSheet.create({
  container: { borderTopColor: '#DDD6E6' },
  heading: { color: '#111827' },
  help: { color: '#4B5563' },
  keyName: { color: '#0A6579' },
  remove: { color: '#B91C1C' },
  message: { color: '#0A6579' },
});
