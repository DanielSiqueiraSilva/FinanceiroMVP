import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useProfileSession } from './ProtectedFinance';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';

export function NativeAccessControl() {
  const auth = useProfileSession();
  const styles = useAccessibleStyles(baseStyles);
  if (!auth || Platform.OS === 'web') return null;
  return (
    <View style={styles.box}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={auth.nativeEnabled ? 'Desativar entrada rápida com biometria' : 'Ativar entrada rápida com biometria'}
        disabled={auth.nativeBusy}
        onPress={() => void (auth.nativeEnabled ? auth.deactivateNative() : auth.activateNative())}
        style={[styles.button, auth.nativeBusy && styles.disabled]}>
        <Text style={styles.label}>
          {auth.nativeBusy ? 'Verificando...' : auth.nativeEnabled ? 'Desativar biometria' : 'Ativar entrada por biometria'}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Bloquear aplicativo" style={styles.button} onPress={auth.lock}>
        <Text style={styles.label}>Bloquear aplicativo</Text>
      </Pressable>
      {auth.nativeMessage ? <Text style={styles.message} accessibilityLiveRegion="polite">{auth.nativeMessage}</Text> : null}
      <Text style={styles.hint}>"Sair" encerra a conta e apaga a credencial local. "Bloquear" permite voltar usando biometria.</Text>
    </View>
  );
}
const baseStyles = StyleSheet.create({
  box: { gap: 8, width: '100%' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#8B5CF6' },
  disabled: { opacity: .6 },
  label: { color: '#DDD6FE', fontSize: 12, fontWeight: '700' },
  message: { color: '#D8B4FE', fontSize: 12 },
  hint: { color: '#94A3B8', fontSize: 11 },
});
