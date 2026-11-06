import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type PropsWithChildren,
} from 'react';
import { Platform, useColorScheme } from 'react-native';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type FontChoice = 'normal' | 'large' | 'extraLarge';

/** Mantemos a chave anterior para não perder preferências já salvas. */
export const ACCESSIBILITY_STORAGE_KEY = '@finanmvp:acessibilidade:v1';
const FONT_SCALE: Record<FontChoice, number> = {
  normal: 1,
  large: 1.2,
  extraLarge: 1.4,
};

type Preferences = { theme: ThemeChoice; font: FontChoice };
const DEFAULTS: Preferences = { theme: 'system', font: 'normal' };

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
function parsePreferences(raw: string | null): Preferences | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const parsed = value as Partial<Preferences>;
    return {
      theme: isTheme(parsed.theme) ? parsed.theme : 'system',
      font: isFont(parsed.font) ? parsed.font : 'normal',
    };
  } catch {
    return null;
  }
}

/** Web: localStorage é síncrono, inclusive quando o usuário fecha a aba. */
function readBrowserPreferences(): Preferences | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try { return parsePreferences(window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)); }
  catch { return null; }
}

function saveBrowserPreferences(value: Preferences) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try { window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(value)); }
  catch (error) { console.warn('Não foi possível salvar o tema neste navegador.', error); }
}

export function AccessibilityProvider({ children }: PropsWithChildren) {
  const reactNativeSystemTheme = useColorScheme();
  const [systemWebDark, setSystemWebDark] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const [ready, setReady] = useState(false);

  // Os eventos do sistema também funcionam quando o tema muda com a página aberta.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemWebDark(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function restore() {
      try {
        // Prioridade na web: a mesma chave que o +html.tsx lê ANTES de carregar o React.
        const browser = readBrowserPreferences();
        const restored = browser ?? parsePreferences(await AsyncStorage.getItem(ACCESSIBILITY_STORAGE_KEY));
        if (!mounted) return;
        const value = restored ?? DEFAULTS;
        setPreferences(value);

        // Migra automaticamente preferências previamente mantidas no AsyncStorage.
        if (Platform.OS === 'web' && !browser && restored) saveBrowserPreferences(value);
      } catch (error) {
        console.warn('Não foi possível recuperar as preferências de acessibilidade.', error);
      } finally {
        if (mounted) setReady(true);
      }
    }
    void restore();
    return () => { mounted = false; };
  }, []);

  const save = useCallback((next: Preferences) => {
    // Após restaurar, gravar imediatamente no navegador evita a corrida
    // entre o clique em "Escuro" e a atualização da página.
    if (Platform.OS === 'web') {
      saveBrowserPreferences(next);
    } else {
      void AsyncStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(next))
        .catch(error => console.warn('Não foi possível salvar a acessibilidade.', error));
    }
  }, []);

  const setTheme = useCallback((theme: ThemeChoice) => {
    if (!ready) return;
    setPreferences(previous => {
      const next = { ...previous, theme };
      save(next);
      return next;
    });
  }, [ready, save]);

  const setFont = useCallback((font: FontChoice) => {
    if (!ready) return;
    setPreferences(previous => {
      const next = { ...previous, font };
      save(next);
      return next;
    });
  }, [ready, save]);

  const value = useMemo<AccessibilityValue>(() => ({
    ...preferences,
    isDark: preferences.theme === 'dark' ||
      (preferences.theme === 'system' &&
        (systemWebDark ?? (reactNativeSystemTheme === 'dark'))),
    fontScale: FONT_SCALE[preferences.font],
    ready, setTheme, setFont,
  }), [preferences, ready, reactNativeSystemTheme, systemWebDark, setTheme, setFont]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility deve ser usado dentro de AccessibilityProvider.');
  return context;
}
