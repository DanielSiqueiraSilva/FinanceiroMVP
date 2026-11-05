import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useProfileSession } from './ProtectedFinance';

function nomeDoUsuario(nome: unknown, email?: string) {
  if (typeof nome === 'string' && nome.trim()) return nome.trim();
  return email?.split('@')[0] || 'Usuário';
}

export function ProfileCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  const auth = useProfileSession();
  const { width } = useWindowDimensions();
  if (!auth) return null;

  const { session, signOut } = auth;
  const email = session.user.email ?? '';
  const nome = nomeDoUsuario(session.user.user_metadata?.full_name, email);
  const inicial = Array.from(nome)[0]?.toLocaleUpperCase('pt-BR') ?? 'U';

  return (
    <View style={[styles.card, width < 720 && styles.cardCompacto]}>
      <View style={styles.conteudo}>
        <View style={styles.avatar} accessible accessibilityLabel={`Inicial de ${nome}: ${inicial}`}>
          <Text style={styles.inicial}>{inicial}</Text>
        </View>
        <View style={styles.identificacao}>
          <Text style={styles.nome} numberOfLines={2}>{nome}</Text>
          <Text style={styles.email} numberOfLines={1}>{email || 'E-mail não informado'}</Text>
        </View>
      </View>
      <View style={styles.acoes}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir configurações de perfil e segurança"
          style={styles.botaoConfiguracoes}
          onPress={onOpenSettings}
        >
          <Text style={styles.textoConfiguracoes}>⚙ Configurações</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Sair da conta" style={styles.botaoSair} onPress={() => void signOut()}>
          <Text style={styles.textoSair}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12,
    maxWidth: '100%', backgroundColor: '#142136', borderColor: '#34435B',
    borderWidth: 1, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 14,
  },
  cardCompacto: { width: '100%', justifyContent: 'flex-start' },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  avatar: { width: 45, height: 45, borderRadius: 999, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  inicial: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 },
  identificacao: { flexShrink: 1, minWidth: 0 },
  nome: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  email: { color: '#B6C2D9', fontSize: 12, marginTop: 3 },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  botaoConfiguracoes: { borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  textoConfiguracoes: { color: '#D8B4FE', fontSize: 12, fontWeight: '700' },
  botaoSair: { backgroundColor: '#332238', borderColor: '#804053', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  textoSair: { color: '#FDA4AF', fontSize: 12, fontWeight: '700' },
});
