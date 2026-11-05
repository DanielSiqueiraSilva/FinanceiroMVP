import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabaseAuth } from '../../auth/supabaseClient';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useProfileSession } from './ProtectedFinance';
import { NativeAccessControl } from './NativeAccessControl';
import { WebPasskeyControl } from './WebPasskeyControl';

function displayName(name: unknown, email?: string) {
  return typeof name === 'string' && name.trim()
    ? name.trim()
    : (email?.split('@')[0] ?? 'Usuário');
}

/** Aba de configurações dentro da sessão protegida; não cria outro login. */
export function AccountSettings({ onBack }: { onBack: () => void }) {
  const auth = useProfileSession();
  const styles = useAccessibleStyles(baseStyles);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  if (!auth) return null;

  const current = displayName(auth.session.user.user_metadata?.full_name, auth.session.user.email);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage('Informe um nome para salvar.');
      return;
    }
    if (saving) return;
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabaseAuth.auth.updateUser({ data: { full_name: trimmed } });
      if (error) throw error;
      setEditing(false);
      setMessage('Nome atualizado com sucesso.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar seu nome.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>Configurações</Text>
          <Text style={styles.subtitle}>Gerencie seu perfil e a segurança da conta.</Text>
        </View>
        <Pressable style={styles.backButton} accessibilityRole="button" onPress={onBack}>
          <Text style={styles.backText}>Voltar ao início</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Dados do perfil</Text>
        <Text style={styles.label}>Nome</Text>
        {editing ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              accessibilityLabel="Novo nome"
              placeholder="Digite seu nome"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
              maxLength={100}
            />
            <View style={styles.actions}>
              <Pressable style={[styles.primary, saving && styles.disabled]} disabled={saving} onPress={() => void saveName()} accessibilityRole="button">
                <Text style={styles.primaryText}>{saving ? 'Salvando...' : 'Salvar nome'}</Text>
              </Pressable>
              <Pressable style={styles.secondary} disabled={saving} onPress={() => { setEditing(false); setMessage(''); }} accessibilityRole="button">
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <Text style={styles.value}>{current}</Text>
            <Pressable style={styles.secondary} accessibilityRole="button" onPress={() => { setName(current); setEditing(true); setMessage(''); }}>
              <Text style={styles.secondaryText}>Editar nome</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.value}>{auth.session.user.email ?? 'Não informado'}</Text>
        {message ? <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Segurança e biometria</Text>
        <Text style={styles.description}>
          Ative a chave de acesso para usar Face ID, impressão digital ou o método seguro do dispositivo no navegador.
          O login por e-mail e senha continuará disponível.
        </Text>
        <View style={styles.securityPanel}>
          <WebPasskeyControl />
          <NativeAccessControl />
        </View>
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: { gap: 18, width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  headerText: { flexShrink: 1, gap: 4 },
  title: { color: '#111827', fontWeight: '900', fontSize: 26 },
  subtitle: { color: '#6B7280', fontSize: 14 },
  section: { width: '100%', borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECE8F1', padding: 18, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  label: { fontSize: 12, color: '#6B7280', fontWeight: '700' },
  value: { fontSize: 16, color: '#111827', fontWeight: '600', flexShrink: 1 },
  description: { color: '#4B5563', fontSize: 13, lineHeight: 20 },
  securityPanel: { backgroundColor: '#142136', borderWidth: 1, borderColor: '#34435B', borderRadius: 14, padding: 14, gap: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  form: { gap: 12 },
  input: { minHeight: 48, color: '#111827', backgroundColor: '#FCFBFD', padding: 12, borderWidth: 1, borderColor: '#DDD6E6', borderRadius: 12, fontSize: 16 },
  primary: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#7C3AED' },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  secondary: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#8B5CF6' },
  secondaryText: { color: '#5B21B6', fontSize: 13, fontWeight: '700' },
  backButton: { borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  backText: { color: '#5B21B6', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: .5 },
  message: { color: '#6D28D9', fontSize: 13 },
});
