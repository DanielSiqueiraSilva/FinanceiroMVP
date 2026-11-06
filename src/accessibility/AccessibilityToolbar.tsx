import { useEffect, useState } from 'react';
import {
  Modal, Platform, Pressable, ScrollView, StyleSheet, Text,
  useWindowDimensions, View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  useAccessibility,
  type AccessibilityFeature, type FontChoice, type ThemeChoice,
} from './AccessibilityContext';
import { readSiteSoundEnabled, observeSiteSoundEnabled, writeSiteSoundEnabled } from '../notifications/soundPreference';

const THEMES: { value: ThemeChoice; title: string; icon: string }[] = [
  { value: 'light', title: 'Claro', icon: '☀' },
  { value: 'dark', title: 'Escuro', icon: '☾' },
  { value: 'system', title: 'Sistema', icon: '▣' },
];
const FONTS: { value: FontChoice; title: string }[] = [
  { value: 'normal', title: 'Normal' },
  { value: 'large', title: 'Maior' },
  { value: 'extraLarge', title: 'Muito maior' },
];

const DARK = {
  panel: '#111326', surface: '#161A31', text: '#F9F7FF', subtle: '#C7C3DE',
  edge: '#51436F', divider: '#3B3553', control: '#191A32',
  selected: '#7C3AED', selectedText: '#FFFFFF',
  accent: '#C084FC', violetCard: '#251547', cardEdge: '#9F5EFF',
  backdrop: 'rgba(4, 5, 20, 0.78)',
  disabled: '#403C59', white: '#FFFFFF',
};
const LIGHT = {
  panel: '#FFFFFF', surface: '#FAF8FF', text: '#1F1738', subtle: '#514A67',
  edge: '#D3C5E9', divider: '#E9E1F3', control: '#F9F6FE',
  selected: '#6D28D9', selectedText: '#FFFFFF',
  accent: '#6D28D9', violetCard: '#F3EAFF', cardEdge: '#9F5EFF',
  backdrop: 'rgba(15, 9, 39, 0.56)',
  disabled: '#CBC2D7', white: '#FFFFFF',
};

type Palette = typeof DARK;
type ToggleProps = {
  icon: string; title: string; description: string; enabled: boolean;
  onChange: (enabled: boolean) => void; colors: Palette;
  scale: number; disabled?: boolean;
};
function ToggleRow({ icon, title, description, enabled, onChange, colors, scale, disabled = false }: ToggleProps) {
  return (
    <View style={ui.toggleRow}>
      <View style={ui.smallIcon}>
        <Text style={{ color: colors.accent, fontSize: 22 }} accessible={false}>{icon}</Text>
      </View>
      <View style={ui.toggleCopy}>
        <Text style={[ui.toggleTitle, { color: colors.text, fontSize: Math.round(14 * scale) }]}>{title}</Text>
        <Text style={[ui.toggleDescription, { color: colors.subtle, fontSize: Math.round(12 * scale) }]}>{description}</Text>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityHint={description}
        accessibilityState={{ checked: enabled, disabled }}
        disabled={disabled}
        onPress={() => onChange(!enabled)}
        style={[
          ui.switchTrack,
          { backgroundColor: enabled ? colors.selected : colors.disabled,
            opacity: disabled ? 0.46 : 1,
            borderColor: enabled ? colors.cardEdge : colors.edge },
        ]}
      >
        <View style={[ui.switchThumb, { alignSelf: enabled ? 'flex-end' : 'flex-start' }]} />
      </Pressable>
    </View>
  );
}

/** O elemento público do VLibras 7.x pode estar dentro de Shadow DOM. */
type VLibrasBrowser = Window & { VLibrasWidget?: { initBtn?: HTMLElement | null } };
function getVLibrasButton(): HTMLElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const official = (window as VLibrasBrowser).VLibrasWidget?.initBtn;
  if (official && typeof official.click === 'function') return official;
  return document.querySelector<HTMLElement>('[vw-access-button]') ??
    document.querySelector<HTMLElement>('.vw-access-button');
}
function hideElement(node: HTMLElement) {
  node.style.setProperty('visibility', 'hidden', 'important');
  node.style.setProperty('opacity', '0', 'important');
  node.style.setProperty('pointer-events', 'none', 'important');
  node.setAttribute('aria-hidden', 'true');
  node.setAttribute('tabindex', '-1');
}
function hideVLibrasExtras() {
  if (typeof document === 'undefined') return false;
  const button = getVLibrasButton();
  if (button) hideElement(button);
  const hidePopup = (root: Document | ShadowRoot) => {
    root.querySelectorAll<HTMLElement>('#vlibras-popup').forEach(node => {
      node.style.setProperty('display', 'none', 'important');
      node.style.setProperty('visibility', 'hidden', 'important');
    });
  };
  hidePopup(document);
  const buttonRoot = button?.getRootNode();
  if (buttonRoot && 'querySelectorAll' in buttonRoot) {
    hidePopup(buttonRoot as Document | ShadowRoot);
  }
  return Boolean(button);
}

/** Um único ponto flutuante Aa, em login e páginas autenticadas. */
export function AccessibilityToolbar() {
  const [open, setOpen] = useState(false);
  const [vlibrasMessage, setVlibrasMessage] = useState('');
  const [vlibrasReady, setVlibrasReady] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(false);
  const { width, height } = useWindowDimensions();
  const {
    theme, font, isDark, fontScale, ready, setTheme, setFont,
    highContrast, reduceMotion, focusHighlight, keyboardNavigation,
    textSpacing, setFeature, resetPreferences,
  } = useAccessibility();
  const colors = isDark ? DARK : LIGHT;
  const narrow = width < 620;

  useEffect(() => {
    setSoundsEnabled(readSiteSoundEnabled());
    return observeSiteSoundEnabled(setSoundsEnabled);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const sync = () => {
      if (hideVLibrasExtras()) setVlibrasReady(true);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(sync, 600);
    return () => { observer.disconnect(); window.clearInterval(interval); };
  }, []);

  function openVLibras() {
    const button = getVLibrasButton();
    if (!button) {
      setVlibrasMessage('O VLibras ainda está carregando. Verifique a conexão e tente novamente.');
      return;
    }
    setVlibrasMessage('');
    hideVLibrasExtras();
    button.click();
    setOpen(false);
  }
  function toggleFeature(key: AccessibilityFeature, enabled: boolean) {
    setFeature(key, enabled);
  }
  function restoreDefaults() {
    resetPreferences();
    writeSiteSoundEnabled(false);
    setVlibrasMessage('');
  }
  function closeAndSave() {
    // Preferências já são gravadas no momento da escolha, inclusive em dispositivos móveis.
    setOpen(false);
  }

  return (
    <>
      <View style={[ui.floatingArea, { top: Math.max(16, Math.round(height / 2) - 100), right: 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir opções de acessibilidade"
          accessibilityHint="Configurar tema, tamanho de texto, som e tradução para Libras"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(true)} style={ui.floatingButton}>
          <Text style={ui.floatingIcon} accessible={false}>Aa</Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setOpen(false)}>
        <View style={ui.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar painel de acessibilidade"
            onPress={() => setOpen(false)}
            style={[ui.backdrop, { backgroundColor: colors.backdrop }]} />
          <View accessibilityViewIsModal accessibilityLabel="Janela de acessibilidade do FinanMVP"
            style={[ui.panel, {
              width: Math.min(754, Math.max(0, width - 24)),
              maxHeight: Math.max(160, height - 26),
              backgroundColor: colors.panel,
              borderColor: colors.cardEdge,
            }]}>
            <View style={[ui.header, { borderBottomColor: colors.divider }]}>
              <View style={[ui.headerSymbol, {
                borderColor: colors.cardEdge,
                backgroundColor: isDark ? '#312062' : '#F0E6FF',
              }]}>
                <Svg width={38} height={38} viewBox="0 0 48 48" fill="none"
                  accessibilityLabel="Símbolo de acessibilidade">
                  <Circle cx={24} cy={8.5} r={3.6} fill={colors.accent} />
                  <Path d="M9 18 24 16.5 39 18M24 17v12M24 29l-10 13M24 29l10 13"
                    stroke={colors.accent} strokeWidth={3.4} strokeLinecap="round"
                    strokeLinejoin="round" />
                </Svg>
              </View>
              <View style={ui.headerCopy}>
                <Text accessibilityRole="header"
                  style={[ui.heading, { color: colors.text, fontSize: Math.round((narrow ? 23 : 28) * fontScale) }]}>
                  Acessibilidade
                </Text>
                <Text style={[ui.headerSubtitle, { color: colors.subtle, fontSize: Math.round(13 * fontScale) }]}>
                  Personalize sua experiência no FinanMVP
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar opções de acessibilidade"
                onPress={() => setOpen(false)}
                style={[ui.closeButton, { borderColor: colors.edge, backgroundColor: colors.surface }]}>
                <Text style={[ui.closeText, { color: colors.text }]}>✕</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator
              style={ui.scroll} contentContainerStyle={ui.body}>
              <View style={[ui.selectorRow, narrow && ui.selectorRowNarrow,
                { borderBottomColor: colors.divider }]}>
                <View style={ui.selectorLabel}>
                  <Text style={[ui.fieldIcon, { color: colors.accent }]}>◉</Text>
                  <Text style={[ui.fieldTitle, { color: colors.text, fontSize: Math.round(15 * fontScale) }]}>Tema</Text>
                </View>
                <View accessibilityRole="radiogroup" accessibilityLabel="Tema de cores"
                  style={[ui.segmentGroup, { backgroundColor: colors.control, borderColor: colors.edge }]}>
                  {THEMES.map(option => (
                    <Pressable key={option.value} accessibilityRole="radio"
                      accessibilityLabel={'Tema ' + option.title}
                      accessibilityState={{ checked: theme === option.value, disabled: !ready }}
                      disabled={!ready} onPress={() => setTheme(option.value)}
                      style={[ui.segment, theme === option.value && ui.segmentSelected,
                        theme === option.value && { backgroundColor: colors.selected, borderColor: colors.cardEdge }]}>
                      <Text style={[ui.segmentText, {
                        color: theme === option.value ? colors.selectedText : colors.text,
                        fontSize: Math.round((narrow ? 11 : 13) * fontScale),
                      }]}>{option.icon}  {option.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[ui.selectorRow, narrow && ui.selectorRowNarrow,
                { borderBottomColor: colors.divider }]}>
                <View style={ui.selectorLabel}>
                  <Text style={[ui.fieldIcon, { color: colors.accent }]}>Aa</Text>
                  <Text style={[ui.fieldTitle, { color: colors.text, fontSize: Math.round(15 * fontScale) }]}>
                    Tamanho da fonte
                  </Text>
                </View>
                <View accessibilityRole="radiogroup" accessibilityLabel="Tamanho da fonte"
                  style={[ui.segmentGroup, { backgroundColor: colors.control, borderColor: colors.edge }]}>
                  {FONTS.map(option => (
                    <Pressable key={option.value} accessibilityRole="radio"
                      accessibilityLabel={'Fonte ' + option.title}
                      accessibilityState={{ checked: font === option.value, disabled: !ready }}
                      disabled={!ready} onPress={() => setFont(option.value)}
                      style={[ui.segment, font === option.value && ui.segmentSelected,
                        font === option.value && { backgroundColor: colors.selected, borderColor: colors.cardEdge }]}>
                      <Text style={[ui.segmentText, {
                        color: font === option.value ? colors.selectedText : colors.text,
                        fontSize: Math.round((narrow ? 10 : 13) * fontScale),
                      }]}>{option.title}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <ToggleRow icon="◐" title="Alto contraste"
                description="Reforça a legibilidade dos textos e das bordas do site."
                enabled={highContrast} onChange={v => toggleFeature('highContrast', v)}
                colors={colors} scale={fontScale} />
              <ToggleRow icon="▷" title="Reduzir animações"
                description="Diminui movimentos, transições e efeitos visuais."
                enabled={reduceMotion} onChange={v => toggleFeature('reduceMotion', v)}
                colors={colors} scale={fontScale} />
              <ToggleRow icon="♫" title="Som de notificações"
                description={Platform.OS === 'web'
                  ? 'Reproduz sons discretos nos avisos importantes.'
                  : 'Sons disponíveis na versão web do site.'}
                enabled={soundsEnabled} onChange={writeSiteSoundEnabled}
                disabled={Platform.OS !== 'web'} colors={colors} scale={fontScale} />
              <ToggleRow icon="▣" title="Leitor de foco"
                description="Destaca os elementos ativos durante a navegação pelo teclado."
                enabled={focusHighlight} onChange={v => toggleFeature('focusHighlight', v)}
                colors={colors} scale={fontScale} />

              <View style={[ui.vlibrasCard, {
                backgroundColor: colors.violetCard, borderColor: colors.cardEdge,
              }]}>
                <View style={[ui.handSymbol, { backgroundColor: isDark ? '#412176' : '#E3D0FF' }]}>
                  <Text style={ui.handEmoji} accessible={false}>🤟</Text>
                </View>
                <View style={ui.vlibrasCopy}>
                  <Text style={[ui.vlibrasHeading, { color: colors.text, fontSize: Math.round(17 * fontScale) }]}>
                    Tradutor VLibras
                  </Text>
                  <Text style={[ui.vlibrasDescription, { color: colors.subtle,
                    fontSize: Math.round(12 * fontScale) }]}>
                    Traduza os conteúdos do site para Língua Brasileira de Sinais (Libras).
                  </Text>
                  {!vlibrasReady && Platform.OS === 'web' &&
                    <Text style={[ui.vlibrasLoading, { color: colors.accent }]}>
                      Carregando o tradutor...
                    </Text>}
                  {!!vlibrasMessage && <Text accessibilityLiveRegion="polite"
                    style={ui.vlibrasError}>{vlibrasMessage}</Text>}
                </View>
                {Platform.OS === 'web' ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Abrir tradutor VLibras"
                    onPress={openVLibras}
                    style={[ui.vlibrasAction, { backgroundColor: colors.selected,
                      borderColor: colors.cardEdge }]}>
                    <Text style={[ui.vlibrasActionText, { fontSize: Math.round(13 * fontScale) }]}>
                      Abrir VLibras  ↗
                    </Text>
                  </Pressable>
                ) : <Text style={[ui.nativeHint, { color: colors.subtle }]}>Disponível na web</Text>}
              </View>

              <ToggleRow icon="⌨" title="Navegação por teclado"
                description="Reforça o destaque de foco usando Tab, Enter e Esc; o teclado permanece disponível."
                enabled={keyboardNavigation} onChange={v => toggleFeature('keyboardNavigation', v)}
                colors={colors} scale={fontScale} />
              <ToggleRow icon="≡" title="Ajustar espaçamento do texto"
                description="Aumenta o espaço entre letras e linhas para facilitar a leitura."
                enabled={textSpacing} onChange={v => toggleFeature('textSpacing', v)}
                colors={colors} scale={fontScale} />

              {!ready && <Text style={[ui.loading, { color: colors.subtle }]}>
                Recuperando preferências...
              </Text>}
            </ScrollView>

            <View style={[ui.footer, { borderTopColor: colors.divider },
              narrow && ui.footerNarrow]}>
              <Pressable accessibilityRole="button" accessibilityLabel="Salvar preferências"
                onPress={closeAndSave} style={[ui.primaryAction,
                  { backgroundColor: colors.selected, borderColor: colors.cardEdge }]}>
                <Text style={[ui.primaryActionText, { fontSize: Math.round(14 * fontScale) }]}>
                  ✓  Salvar preferências
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Restaurar preferências padrão"
                onPress={restoreDefaults} disabled={!ready}
                style={[ui.secondaryAction, { borderColor: colors.edge,
                  backgroundColor: colors.surface, opacity: ready ? 1 : .5 }]}>
                <Text style={[ui.secondaryActionText, {
                  color: colors.text, fontSize: Math.round(13 * fontScale),
                }]}>↻  Restaurar padrão</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const ui = StyleSheet.create({
  floatingArea: {
    position: 'absolute', zIndex: 1000, elevation: 12, pointerEvents: 'box-none',
  },
  floatingButton: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#7C3AED',
    borderWidth: 2, borderColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 3px 8px rgba(17,24,39,0.24)' },
      android: { elevation: 5 },
      ios: { shadowColor: '#111827', shadowOpacity: 0.24, shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 } },
    }),
  },
  floatingIcon: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  modalRoot: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12,
  },
  backdrop: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
  },
  panel: {
    borderRadius: 24, borderWidth: 1.5, overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 0 18px rgba(124,58,237,0.38), 0 26px 68px rgba(7,3,23,0.50)' },
      android: { elevation: 15 },
      ios: { shadowColor: '#7C3AED', shadowRadius: 24, shadowOpacity: .36,
        shadowOffset: { width: 0, height: 10 } },
    }),
  },
  header: {
    paddingHorizontal: 22, paddingVertical: 19, flexDirection: 'row',
    alignItems: 'center', gap: 16, borderBottomWidth: 1,
  },
  headerSymbol: {
    width: 58, height: 58, borderRadius: 29, alignItems: 'center',
    justifyContent: 'center', borderWidth: 2,
  },
  headerCopy: { flex: 1, gap: 4, minWidth: 0 },
  heading: { fontWeight: '900', letterSpacing: -0.6 },
  headerSubtitle: { fontWeight: '500', lineHeight: 20 },
  closeButton: {
    width: 42, height: 42, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { fontSize: 19, fontWeight: '700' },
  scroll: { flexShrink: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 18, paddingTop: 5 },
  selectorRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, gap: 12, borderBottomWidth: 1,
  },
  selectorRowNarrow: { flexDirection: 'column', alignItems: 'stretch', gap: 9 },
  selectorLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 14, flexGrow: 1, minWidth: 0,
  },
  fieldIcon: { width: 32, textAlign: 'center', fontSize: 22, fontWeight: '800' },
  fieldTitle: { fontWeight: '800' },
  segmentGroup: {
    borderWidth: 1, borderRadius: 12, flexDirection: 'row',
    alignItems: 'stretch', flex: 1, minWidth: 0,
    overflow: 'hidden', minHeight: 43, maxWidth: 414,
  },
  segment: {
    flex: 1, paddingHorizontal: 6, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', minWidth: 0,
  },
  segmentSelected: { borderWidth: 1, borderRadius: 10 },
  segmentText: { fontWeight: '800', textAlign: 'center' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', minHeight: 68,
    paddingVertical: 10, gap: 12,
  },
  smallIcon: { width: 36, alignItems: 'center', justifyContent: 'center' },
  toggleCopy: { flex: 1, gap: 3, minWidth: 0 },
  toggleTitle: { fontWeight: '800' },
  toggleDescription: { lineHeight: 18, fontWeight: '400' },
  switchTrack: {
    width: 58, height: 32, borderRadius: 18, borderWidth: 1,
    paddingHorizontal: 3, justifyContent: 'center',
  },
  switchThumb: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF',
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.26)' } }),
  },
  vlibrasCard: {
    flexDirection: 'row', alignItems: 'center', gap: 13, flexWrap: 'wrap',
    borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 16,
    paddingVertical: 15, marginVertical: 10,
    ...Platform.select({
      web: { boxShadow: '0 0 17px rgba(129,43,251,0.18)' },
    }),
  },
  handSymbol: {
    width: 66, height: 66, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
  },
  handEmoji: { fontSize: 30 },
  vlibrasCopy: { flex: 1, minWidth: 160, gap: 5 },
  vlibrasHeading: { fontWeight: '900' },
  vlibrasDescription: { lineHeight: 18 },
  vlibrasLoading: { fontSize: 11, fontWeight: '700' },
  vlibrasError: { color: '#F87171', fontSize: 12, lineHeight: 17 },
  vlibrasAction: {
    borderWidth: 1.5, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', minHeight: 48, paddingHorizontal: 16,
    paddingVertical: 8, flexGrow: 0,
    ...Platform.select({
      web: { boxShadow: '0 0 13px rgba(168,85,247,0.40)' },
    }),
  },
  vlibrasActionText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' },
  nativeHint: { fontSize: 12 },
  footer: {
    borderTopWidth: 1, paddingHorizontal: 20, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'stretch', gap: 12,
  },
  footerNarrow: { flexDirection: 'column' },
  primaryAction: {
    minHeight: 52, borderWidth: 1, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flex: 1,
    paddingHorizontal: 12, paddingVertical: 12,
    ...Platform.select({
      web: { boxShadow: '0 0 15px rgba(147,51,234,0.32)' },
    }),
  },
  primaryActionText: { color: '#FFFFFF', fontWeight: '900', textAlign: 'center' },
  secondaryAction: {
    minHeight: 52, borderWidth: 1, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flex: 0.8,
    paddingHorizontal: 10, paddingVertical: 12,
  },
  secondaryActionText: { fontWeight: '800', textAlign: 'center' },
  loading: { fontSize: 12, paddingVertical: 6 },
});
