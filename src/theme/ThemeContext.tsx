import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { AppColors, darkColors, lightColors } from './colors';

type Scheme = 'light' | 'dark';

type ThemeContextValue = {
  scheme: Scheme;
  colors: AppColors;
  isDark: boolean;
  toggleTheme: () => void;
};

const STORAGE_KEY = '@financeiromvp/theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function lerPreferenciaSalva(): Scheme | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const valor = localStorage.getItem(STORAGE_KEY);
    return valor === 'light' || valor === 'dark' ? valor : null;
  } catch {
    return null;
  }
}

function salvarPreferencia(scheme: Scheme) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, scheme);
  } catch {
    // Armazenamento indisponível (ex.: modo anônimo) — a preferência só vale para a sessão atual.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const schemeDoSistema = useColorScheme();
  const [scheme, setScheme] = useState<Scheme>(() => lerPreferenciaSalva() ?? (schemeDoSistema === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    // Só acompanha o sistema enquanto o usuário não escolheu manualmente um tema.
    if (lerPreferenciaSalva()) return;
    setScheme(schemeDoSistema === 'dark' ? 'dark' : 'light');
  }, [schemeDoSistema]);

  function toggleTheme() {
    setScheme((atual) => {
      const proximo = atual === 'dark' ? 'light' : 'dark';
      salvarPreferencia(proximo);
      return proximo;
    });
  }

  const value = useMemo<ThemeContextValue>(() => ({
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    isDark: scheme === 'dark',
    toggleTheme,
  }), [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const contexto = useContext(ThemeContext);
  if (!contexto) throw new Error('useTheme precisa ser usado dentro de um ThemeProvider.');
  return contexto;
}
