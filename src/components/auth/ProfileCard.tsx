import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { supabaseAuth } from '../../auth/supabaseClient';
import { useProfileSession } from './ProtectedFinance';

function nomeDoUsuario(nome: unknown, email?: string) {
  if (typeof nome === 'string' && nome.trim()) return nome.trim();
  return email?.split('@')[0] || 'Usuário';
}

export function ProfileCard() {
  const auth = useProfileSession();
  const { width } = useWindowDimensions();
  const [editando, setEditando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  if (!auth) return null;

  const { session, signOut } = auth;
  const email = session.user.email ?? '';
  const nome = nomeDoUsuario(session.user.user_metadata?.full_name, email);
  const inicial = Array.from(nome)[0]?.toLocaleUpperCase('pt-BR') ?? 'U';
  const compacto = width < 720;

  async function salvarPerfil() {
    const nomeCorrigido = novoNome.trim();
    if (!nomeCorrigido) {
      setMensagem('Informe um nome para salvar.');
      return;
    }
    setSalvando(true);
    setMensagem('');
    try {
      const { error } = await supabaseAuth.auth.updateUser({
        data: { full_name: nomeCorrigido },
      });
      if (error) throw error;
      setEditando(false);
      setMensagem('Perfil atualizado.');
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : 'Não foi possível atualizar o perfil.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={[styles.card, compacto && styles.cardCompacto]}>
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
          accessibilityLabel={editando ? 'Cancelar edição do perfil' : 'Editar perfil'}
          style={styles.botaoEditar}
          onPress={() => {
            setNovoNome(nome);
            setMensagem('');
            setEditando(!editando);
          }}
        >
          <Text style={styles.textoEditar}>{editando ? 'Cancelar' : 'Editar perfil'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          style={styles.botaoSair}
          onPress={() => void signOut()}
        >
          <Text style={styles.textoSair}>Sair</Text>
        </Pressable>
      </View>

      {editando && (
        <View style={styles.edicao}>
          <TextInput
            style={styles.campo}
            accessibilityLabel="Novo nome do perfil"
            placeholder="Seu nome"
            placeholderTextColor="#94A3B8"
            value={novoNome}
            onChangeText={setNovoNome}
            autoCapitalize="words"
          />
          <Pressable
            accessibilityRole="button"
            disabled={salvando}
            onPress={() => void salvarPerfil()}
            style={[styles.botaoSalvar, salvando && styles.botaoDesabilitado]}
          >
            <Text style={styles.textoSalvar}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
          </Pressable>
        </View>
      )}
      {mensagem ? (
        <Text style={styles.mensagem} accessibilityLiveRegion="polite">{mensagem}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
    maxWidth: '100%',
    backgroundColor: '#142136',
    borderColor: '#34435B',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  cardCompacto: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 999,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 },
  identificacao: { flexShrink: 1, minWidth: 0 },
  nome: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  email: { color: '#B6C2D9', fontSize: 12, marginTop: 3 },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  botaoEditar: {
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  textoEditar: { color: '#D8B4FE', fontSize: 12, fontWeight: '700' },
  botaoSair: {
    backgroundColor: '#332238',
    borderColor: '#804053',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  textoSair: { color: '#FDA4AF', fontSize: 12, fontWeight: '700' },
  edicao: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', width: '100%', gap: 8 },
  campo: {
    flexGrow: 1,
    minWidth: 130,
    backgroundColor: '#192C46',
    borderColor: '#475569',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 14,
  },
  botaoSalvar: { backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  botaoDesabilitado: { opacity: 0.6 },
  textoSalvar: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  mensagem: { color: '#D8B4FE', fontSize: 12, width: '100%' },
});
