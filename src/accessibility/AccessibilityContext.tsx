import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type FontChoice = 'normal' | 'large' | 'extraLarge';

const STORAGE_KEY = '@finanmvp:acessibilidade:v1';
const FONT_SCALE: Record<FontChoice, number> = {
  normal: 1,
  large: 1.2,
  extraLarge: 1.4,
};

type Preferences = { theme: ThemeChoice; font: FontChoice };

type AccessibilityValue = Preferences & {
  isDark: boolean;
  fontScale: number;
  ready: boolean;
  setTheme: (value: ThemeChoice) => void;
  setFont: (value: FontChoice) => void;
};

const AccessibilityContext = createContext<AccessibilityValue | null>(null);

function isTheme(value: unknown): value is ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'system';
}
function isFont(value: unknown): value is FontChoice {
  return value === 'normal' || value === 'large' || value === 'extraLarge';
}

export function AccessibilityProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const [preferences, setPreferences] = useState<Preferences>({ theme: 'system', font: 'normal' });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function restore() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && mounted) {
          const value: Partial<Preferences> = JSON.parse(stored);
          setPreferences({
            theme: isTheme(value.theme) ? value.theme : 'system',
            font: isFont(value.font) ? value.font : 'normal',
          });
        }
      } catch (error) {
        console.warn('Não foi possível recuperar as preferências de acessibilidade.', error);
      } finally {
        if (mounted) setReady(true);
      }
    }
    void restore();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)).catch((error) => {
      console.warn('Não foi possível guardar as preferências de acessibilidade.', error);
    });
  }, [preferences, ready]);

  const value = useMemo<AccessibilityValue>(() => ({
    ...preferences,
    isDark: preferences.theme === 'dark' || (preferences.theme === 'system' && systemTheme === 'dark'),
    fontScale: FONT_SCALE[preferences.font],
    ready,
    setTheme: (theme) => setPreferences((previous) => ({ ...previous, theme })),
    setFont: (font) => setPreferences((previous) => ({ ...previous, font })),
  }), [preferences, ready, systemTheme]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility deve ser usado dentro de AccessibilityProvider.');
  return context;
}
