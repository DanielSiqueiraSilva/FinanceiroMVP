import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';
import { View } from 'react-native';
import { AccessibilityProvider, useAccessibility } from '../accessibility/AccessibilityContext';
import { AccessibilityToolbar } from '../accessibility/AccessibilityToolbar';

function LayoutInterno() {
  const { isDark } = useAccessibility();
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0B1220" : "#F7F5FA" }}>
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
