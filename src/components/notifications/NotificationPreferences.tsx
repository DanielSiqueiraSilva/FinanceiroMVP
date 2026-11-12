import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { OceanPressable as Pressable } from '../../design/OceanControls';
import { useAccessibleStyles } from '../../accessibility/useAccessibleStyles';
import { useAccessibility } from '../../accessibility/AccessibilityContext';
import { useNotifications, type NotificationSettings } from '../../notifications/NotificationsContext';

const fields: { key: keyof NotificationSettings; title: string; hint: string }[] = [
  { key: 'enabled', title: 'Avisos na tela', hint: 'Exibir confirmações e avisos discretos enquanto navega.' },
  { key: 'finance', title: 'Movimentações financeiras', hint: 'Lançamentos, alterações e limites mensais.' },
  { key: 'message', title: 'Mensagens', hint: 'Disponível quando o site tiver mensagens.' },
  { key: 'warning', title: 'Alertas importantes', hint: 'Problemas em operações e avisos de atenção.' },
  { key: 'system', title: 'Atualizações do sistema', hint: 'Avisos e informações importantes.' },
  { key: 'sounds', title: 'Efeitos sonoros', hint: 'Sons leves, desligados inicialmente. O navegador pode exigir um toque para permitir áudio.' },
  { key: 'clickSounds', title: 'Som nos botões', hint: 'Cliques discretos em ações do site, somente com sons ativados.' },
];

export function NotificationPreferences() {
  const n = useNotifications();
  const styles = useAccessibleStyles(baseStyles);
  const { isDark } = useAccessibility();
  if (!n) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle} accessibilityRole="header">Notificações e sons</Text>
      <Text style={styles.description}>
        Escolha o que quer receber. Suas preferências de som ficam salvas neste navegador para a sua conta.
        O histórico de avisos financeiros continua disponível na central, mesmo com os sons desligados.
      </Text>
      {fields.map(({ key, title, hint }) => {
        const disabled = key === 'clickSounds' && !n.settings.sounds;
        return (
          <View style={styles.field} key={key}>
            <View style={styles.info}>
              <Text style={styles.fieldTitle}>{title}</Text>
              <Text style={styles.hint}>{hint}</Text>
            </View>
            <Switch
              accessibilityLabel={title}
              value={n.settings[key]}
              disabled={disabled}
              onValueChange={value => n.changeSettings({ [key]: value })}
              trackColor={{ true: isDark ? '#167F8D' : '#39ABB1', false: isDark ? '#536177' : '#C4D7DB' }}
              thumbColor="#FFFFFF"
            />
          </View>
        );
      })}
      {Platform.OS === 'web' && (
        <Pressable accessibilityRole="button" disabled={!n.settings.sounds} style={[styles.test, !n.settings.sounds && styles.disabled]}
          onPress={n.testSound}>
          <Text style={styles.testText}>♪ Testar som</Text>
        </Pressable>
      )}
      {Platform.OS !== 'web' && (
        <Text style={styles.hint}>Os sons personalizados desta versão estão disponíveis no navegador web.</Text>
      )}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: { gap: 11, width: '100%' },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  description: { color: '#4B5563', fontSize: 13, lineHeight: 19 },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    borderBottomColor: '#E5E7EB', borderBottomWidth: 1, minHeight: 62, paddingVertical: 6 },
  info: { flex: 1, gap: 3 },
  fieldTitle: { color: '#111827', fontSize: 13, fontWeight: '700' },
  hint: { color: '#6B7280', fontSize: 12, lineHeight: 17 },
  test: { alignSelf: 'flex-start', backgroundColor: '#7C3AED', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, minHeight: 43, justifyContent: 'center' },
  testText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  disabled: { opacity: .4 },
});
