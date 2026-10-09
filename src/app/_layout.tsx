import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';
import {AccessibilityProvider,useAccessibility,} from '../accessibility/AccessibilityContext';

function LayoutInterno() {
  const { isDark } = useAccessibility();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <AccessibilityProvider>
      <LayoutInterno />
    </AccessibilityProvider>
  );
}
