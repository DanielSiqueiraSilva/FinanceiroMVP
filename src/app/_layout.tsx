import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';
import { Platform, View } from 'react-native';
import { AccessibilityProvider, useAccessibility } from '../accessibility/AccessibilityContext';
import { AccessibilityToolbar } from '../accessibility/AccessibilityToolbar';

function LayoutInterno() {
  const { isDark, ready, highContrast, reduceMotion, focusHighlight, keyboardNavigation, textSpacing } = useAccessibility();
  useEffect(() => {
    if (!ready || Platform.OS !== 'web' || typeof document === 'undefined') return;
    // Sincroniza também os controles do navegador (inputs, selects, scrollbar)
    // com a preferência selecionada em Aa ou com o modo do sistema.
    const mode = isDark ? 'dark' : 'light';
    const background = isDark ? '#0B1220' : '#F7F5FA';
    document.documentElement.style.colorScheme = mode;
    document.documentElement.style.backgroundColor = background;
    document.documentElement.setAttribute('data-finance-theme', mode);
    document.documentElement.setAttribute('data-finance-theme-ready', 'true');
    document.documentElement.setAttribute('data-finance-high-contrast', String(highContrast));
    document.documentElement.setAttribute('data-finance-reduce-motion', String(reduceMotion));
    document.documentElement.setAttribute('data-finance-focus', String(focusHighlight));
    document.documentElement.setAttribute('data-finance-keyboard', String(keyboardNavigation));
    document.documentElement.setAttribute('data-finance-text-spacing', String(textSpacing));
    document.body.style.backgroundColor = background;
  }, [isDark, ready, highContrast, reduceMotion, focusHighlight, keyboardNavigation, textSpacing]);
  return (
    <View style={{
      flex: 1,
      backgroundColor: isDark ? '#0B1220' : '#F7F5FA',
      // O HTML inicial já pinta o fundo com o tema salvo. Esconde o
      // conteúdo apenas até a restauração terminar, evitando que login,
      // dashboard e janela Aa apareçam com paletas diferentes no refresh.
      opacity: Platform.OS === 'web' && !ready ? 0 : 1,
    }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
      {/* Fora de ProtectedFinance: acessível no login, cadastro e área financeira. */}
      <AccessibilityToolbar />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AccessibilityProvider>
      <LayoutInterno />
    </AccessibilityProvider>
  );
}
