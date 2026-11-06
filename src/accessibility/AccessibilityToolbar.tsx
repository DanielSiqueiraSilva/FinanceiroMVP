import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useAccessibility, type FontChoice, type ThemeChoice } from './AccessibilityContext';
import { useAccessibleStyles } from './useAccessibleStyles';

const THEMES: { value: ThemeChoice; title: string }[] = [
  { value: 'light', title: 'Claro' },
  { value: 'dark', title: 'Escuro' },
  { value: 'system', title: 'Sistema' },
];

const FONTS: { value: FontChoice; title: string }[] = [
  { value: 'normal', title: 'Normal' },
  { value: 'large', title: 'Maior (+20%)' },
  { value: 'extraLarge', title: 'Muito maior (+40%)' },
];

/** Único acesso flutuante aos recursos de leitura e ao VLibras na web. */
type VLibrasBrowser = Window & {
  VLibrasWidget?: { initBtn?: HTMLElement | null };
};

function getVLibrasButton(): HTMLElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  // VLibras 7.x: o botão está numa shadow root e NÃO aparece no querySelector.
  // A documentação oficial expõe o botão como window.VLibrasWidget.initBtn.
  const official = (window as VLibrasBrowser).VLibrasWidget?.initBtn;
  if (official && typeof official.click === 'function') return official;
  // Compatibilidade com versões mais antigas.
  return document.querySelector<HTMLElement>('[vw-access-button]') ??
    document.querySelector<HTMLElement>('.vw-access-button');
}

function hideVLibrasLauncher(button: HTMLElement) {
  // Aplica os estilos diretamente ao botão: CSS de fora não atravessa
  // a shadow root criada pelo VLibras atual.
  button.style.setProperty('visibility', 'hidden', 'important');
  button.style.setProperty('opacity', '0', 'important');
  button.style.setProperty('pointer-events', 'none', 'important');
  button.setAttribute('aria-hidden', 'true');
  button.setAttribute('tabindex', '-1');
}
export function AccessibilityToolbar() {
  const [open, setOpen] = useState(false);
  const [vlibrasMessage, setVlibrasMessage] = useState('');
  const [vlibrasReady, setVlibrasReady] = useState(false);
  const { width, height } = useWindowDimensions();
  const { theme, font, setTheme, setFont, ready } = useAccessibility();
  const styles = useAccessibleStyles(baseStyles);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    // O script do VLibras chega após a hidratação React. Observamos o DOM e
    // o handle oficial para ocultar o launcher assim que ele aparecer.
    const sync = () => {
      const button = getVLibrasButton();
      if (!button) return;
      hideVLibrasLauncher(button);
      setVlibrasReady(previous => previous || true);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    // O conteúdo de uma shadow root não dispara a observer externa;
    // uma verificação leve cobre esse caso e reinicializações do widget.
    const interval = window.setInterval(sync, 500);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  function openVLibras() {
    const button = getVLibrasButton();
    if (!button) {
      setVlibrasMessage('O VLibras ainda está carregando. Verifique a conexão e tente novamente.');
      return;
    }
    setVlibrasMessage('');
    // Aciona o botão oficial (mesmo invisível), preservando o painel tradutor.
    hideVLibrasLauncher(button);
    button.click();
    setOpen(false);
  }

  return (
    <>
      <View
        style={[
          styles.floatingArea,
          {
            top: Math.max(16, Math.round(height / 2) - 100),
            right: 8,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir opções de acessibilidade"
          accessibilityHint="Configurar tema, tamanho das letras e tradução para Libras"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(true)}
          style={styles.floatingButton}
        >
          <Text style={styles.floatingIcon} accessible={false}>
            Aa
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel="Fechar painel de acessibilidade"
            onPress={() => setOpen(false)}
          />

          <View
            accessibilityViewIsModal
            accessibilityLabel="Configurações de acessibilidade"
            style={[
              styles.panel,
              {
                width: Math.max(0, Math.min(380, width - 32)),
                maxHeight: Math.max(160, height - 32),
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">Acessibilidade</Text>
              <Pressable
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Fechar opções de acessibilidade"
                onPress={() => setOpen(false)}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.panelContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.description}>
                Ajuste a leitura. Suas preferências continuam salvas após fechar o aplicativo.
              </Text>

              <Text style={styles.label} accessibilityRole="header">Tema de cores</Text>
              <View style={styles.buttons} accessibilityRole="radiogroup" accessibilityLabel="Selecionar tema">
                {THEMES.map(({ value, title }) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={`Tema ${title}`}
                    accessibilityState={{ checked: theme === value, disabled: !ready }}
                    disabled={!ready}
                    onPress={() => setTheme(value)}
                    style={[styles.button, theme === value && styles.selected]}
                  >
                    <Text style={[styles.buttonText, theme === value && styles.selectedText]}>{title}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label} accessibilityRole="header">Tamanho da fonte</Text>
              <View style={styles.buttons} accessibilityRole="radiogroup" accessibilityLabel="Selecionar tamanho da fonte">
                {FONTS.map(({ value, title }) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={`Fonte ${title}`}
                    accessibilityState={{ checked: font === value, disabled: !ready }}
                    disabled={!ready}
                    onPress={() => setFont(value)}
                    style={[styles.button, font === value && styles.selected]}
                  >
                    <Text style={[styles.buttonText, font === value && styles.selectedText]}>{title}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label} accessibilityRole="header">Tradução em Libras</Text>
              {Platform.OS === 'web' ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir tradutor VLibras"
                    onPress={openVLibras}
                    style={styles.vlibrasButton}
                  >
                    <Text style={styles.vlibrasText}>Abrir VLibras</Text>
                  </Pressable>
                  <Text style={styles.description}>
                    {vlibrasReady ? 'Traduza conteúdos do site para Libras com o intérprete virtual.' : 'Aguardando carregamento do VLibras...'}
                  </Text>
                  {vlibrasMessage ? <Text style={styles.error} accessibilityLiveRegion="polite">{vlibrasMessage}</Text> : null}
                </>
              ) : (
                <Text style={styles.description}>O VLibras integrado está disponível na versão web.</Text>
              )}
              {!ready ? <Text style={styles.description}>Carregando preferências...</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const baseStyles = StyleSheet.create({
  floatingArea: {
    position: 'absolute',
    zIndex: 1000,
    elevation: 12,
    pointerEvents: 'box-none',
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderWidth: 2,
    borderColor: '#FFFFFF',

    ...Platform.select({
      web: {
        boxShadow: '0px 3px 8px rgba(17, 24, 39, 0.24)',
      },
      android: {
        elevation: 5,
      },
      ios: {
        shadowColor: '#111827',
        shadowOpacity: 0.24,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  floatingIcon: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  panel: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE8F1',
    borderWidth: 1,

    ...Platform.select({
      web: {
        boxShadow: '0px 5px 16px rgba(17, 24, 39, 0.22)',
      },
      android: {
        elevation: 10,
      },
      ios: {
        shadowColor: '#111827',
        shadowOpacity: 0.22,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 5 },
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 10,
  },
  title: { flex: 1, color: '#111827', fontSize: 19, fontWeight: '800' },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  closeText: { color: '#374151', fontSize: 19, fontWeight: '800' },
  panelContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 12 },
  description: { color: '#4B5563', fontSize: 13, lineHeight: 19 },
  label: { color: '#111827', fontSize: 14, fontWeight: '800', marginTop: 4 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    flexGrow: 1,
    minHeight: 48,
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: '#D8D2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  buttonText: { color: '#374151', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  selectedText: { color: '#5B21B6' },
  vlibrasButton: { backgroundColor: '#1D4ED8', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', minHeight: 48 },
  vlibrasText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  error: { color: '#991B1B', fontSize: 13 },
});
