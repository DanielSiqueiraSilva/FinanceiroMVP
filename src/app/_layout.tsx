import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';

function LayoutInterno() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LayoutInterno />
    </ThemeProvider>
  );
}
