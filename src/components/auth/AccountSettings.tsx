import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { OceanButton, OceanPressable as Pressable } from '../../design/OceanControls';
import { supabaseAuth } from '../../auth/supabaseClient';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { useProfileSession } from './ProtectedFinance';
import { NativeAccessControl } from './NativeAccessControl';
import { WebPasskeyControl } from './WebPasskeyControl';
import { NotificationPreferences } from '../notifications/NotificationPreferences';

function displayName(name: unknown, email?: string) {
  return typeof name === 'string' && name.trim()
    ? name.trim()
    : (email?.split('@')[0] ?? 'Usuário');
}

/** Aba de configurações dentro da sessão protegida; não cria outro login. */
export function AccountSettings({ onBack }: { onBack: () => void }) {
  const auth = useProfileSession();
  const { isDark } = useAccessibility();
  const styles = useAccessibleStyles(baseStyles);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeletion, setShowDeletion] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

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

  async function deleteOwnAccount() {
    if (!auth || deleteBusy || deletePassword.length < 6 || deleteConfirmation !== 'EXCLUIR') return;
    setDeleteBusy(true);
    setDeleteMessage('');
    try {
      // Exclusão somente pelo servidor. A chave administrativa não existe no frontend.
      const { data, error } = await supabaseAuth.functions.invoke('delete-account', {
        body: { password: deletePassword, confirmation: deleteConfirmation },
      });
      if (error) {
        // O Edge Function pode retornar um erro de autenticação ou validação.
        const context = 'context' in error ? error.context : null;
        let explanation = '';
        if (context && typeof context === 'object' && 'json' in context &&
            typeof context.json === 'function') {
          try {
            const result = await context.json();
            if (typeof result?.message === 'string') explanation = result.message;
          } catch {}
        }
        throw new Error(explanation || 'Não foi possível excluir a conta. Verifique a senha e tente novamente.');
      }
      if (data?.message !== 'Conta excluída com sucesso.') {
        throw new Error('Não foi possível confirmar a exclusão no servidor.');
      }
      setShowDeletion(false);
      setDeletePassword('');
      setDeleteConfirmation('');
      // Encerra a sessão e apaga a credencial biométrica local, quando existir.
      await auth.signOut();
    } catch (error) {
      setDeleteMessage(error instanceof Error ? error.message : 'Erro ao excluir conta.');
    } finally {
      setDeletePassword('');
      setDeleteBusy(false);
    }
  }

  function cancelDeletion() {
    if (deleteBusy) return;
    setShowDeletion(false);
    setDeletePassword('');
    setDeleteConfirmation('');
    setDeleteMessage('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>Configurações</Text>
          <Text style={styles.subtitle}>Gerencie seu perfil e a segurança da conta.</Text>
        </View>
        <OceanButton label="Voltar ao início" variant="glass" onPress={onBack}/>
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
              <OceanButton label="Salvar nome" variant="primary" loading={saving}
                onPress={() => void saveName()}/>
              <OceanButton label="Cancelar" variant="glass" disabled={saving}
                onPress={() => { setEditing(false); setMessage(''); }}/>
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <Text style={styles.value}>{current}</Text>
            <OceanButton label="Editar nome" variant="glass"
              onPress={() => { setName(current); setEditing(true); setMessage(''); }}/>
          </View>
        )}
        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.value}>{auth.session.user.email ?? 'Não informado'}</Text>
        {message ? <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text> : null}
      </View>

      <View style={styles.section}>
        <NotificationPreferences />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Segurança e biometria</Text>
        <Text style={styles.description}>
          Ative a chave de acesso para usar Face ID, impressão digital ou o método seguro do dispositivo no navegador.
          O login por e-mail e senha continuará disponível.
        </Text>
        <View style={[styles.securityPanel, !isDark && lightSettings.securityPanel]}>
          <WebPasskeyControl />
          <NativeAccessControl />
        </View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Sessão</Text>
        <Text style={styles.description}>Encerre seu acesso com segurança neste dispositivo.</Text>
        <OceanButton label="Sair da conta" variant="glass"
          onPress={() => void auth.signOut()} style={styles.actionAlign}/>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Excluir minha conta</Text>
        <Text style={styles.description}>
          A exclusão é definitiva e remove seu acesso, lançamentos, limites mensais e histórico
          de notificações. Esta ação não pode ser desfeita.
        </Text>
        {!showDeletion ? (
          <OceanButton label="Excluir minha conta..." variant="danger"
            accessibilityHint="Abre as confirmações necessárias para excluir a conta"
            onPress={() => { setShowDeletion(true); setDeleteMessage(''); }}
            style={styles.actionAlign}/>
        ) : (
          <View style={styles.deletionForm}>
            <Text style={styles.warningText}>
              Confirme sua identidade. Digite sua senha atual e depois escreva EXCLUIR
              exatamente como mostrado. Nenhuma informação será removida até confirmar.
            </Text>
            <Text style={styles.label}>Senha atual</Text>
            <TextInput accessibilityLabel="Senha atual para excluir conta"
              secureTextEntry autoComplete="off" textContentType="password"
              autoCapitalize="none" placeholder="Sua senha atual"
              placeholderTextColor={isDark ? '#94A3B8' : '#6B7280'}
              value={deletePassword} onChangeText={setDeletePassword}
              editable={!deleteBusy} style={styles.input} maxLength={256} />
            <Text style={styles.label}>Digite EXCLUIR para confirmar</Text>
            <TextInput accessibilityLabel="Digite EXCLUIR para confirmar a exclusão"
              autoCapitalize="characters" autoComplete="off" placeholder="EXCLUIR"
              placeholderTextColor={isDark ? '#94A3B8' : '#6B7280'}
              value={deleteConfirmation} onChangeText={setDeleteConfirmation}
              editable={!deleteBusy} style={styles.input} maxLength={10} />
            {deleteMessage ? <Text accessibilityLiveRegion="polite"
              style={styles.warningText}>{deleteMessage}</Text> : null}
            <View style={styles.actions}>
              <OceanButton variant="danger" label="Excluir conta definitivamente"
                loading={deleteBusy}
                disabled={deleteConfirmation !== 'EXCLUIR' || deletePassword.length < 6}
                accessibilityHint="Exclusão permanente após as confirmações de identidade"
                onPress={() => void deleteOwnAccount()}/>
              <OceanButton label="Cancelar" variant="glass" disabled={deleteBusy}
                onPress={cancelDeletion}/>
            </View>
          </View>
        )}
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
  actionAlign: { alignSelf: 'flex-start' },
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
  deletionForm: { gap: 12 },
  warningText: { fontSize: 13, color: '#B91C1C', lineHeight: 20 },
  dangerOutline: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#B91C1C',
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  dangerOutlineText: { fontSize: 13, fontWeight: '700', color: '#B91C1C' },
  dangerButton: { alignSelf: 'flex-start', backgroundColor: '#B91C1C', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 15 },
  dangerButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});

const lightSettings = StyleSheet.create({
  securityPanel: { backgroundColor: '#FFFFFF', borderColor: '#DDD6E6' },
});
