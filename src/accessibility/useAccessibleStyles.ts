import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { useAccessibility } from './AccessibilityContext';

/**
 * Aplica tema e escala da fonte às folhas de estilo já existentes.
 * Preserva layouts e cores semânticas do projeto; não modifica o backend.
 */
const DARK_PALETTE: Record<string, string> = {
  '#FFFFFF': '#142033',
  '#FCFBFD': '#19273D',
  '#F7F5FA': '#0B1220',
  '#F3F4F6': '#243248',
  '#F4F1F8': '#27334A',
  '#EDE9FE': '#312448',
  '#ECFDF5': '#12352D',
  '#FEF2F2': '#3D2028',
  '#FFF1F2': '#3D2028',
  '#ECE8F1': '#39475B',
  '#DDD6E6': '#536177',
  '#E5E7EB': '#39475B',
  '#D8D2E2': '#536177',
  '#E6E0EC': '#39475B',
  '#FECACA': '#834653',
  '#FECDD3': '#834653',
  '#A7F3D0': '#35695A',
  '#111827': '#F8FAFC',
  '#374151': '#E2E8F0',
  '#4B5563': '#CBD5E1',
  '#6B7280': '#C1CBD8',
  '#5B21B6': '#D8B4FE',
  '#6D28D9': '#C4B5FD',
  '#7C3AED': '#8557F5',
  '#8B5CF6': '#A78BFA',
  '#15803D': '#86EFAC',
  '#166534': '#86EFAC',
  '#047857': '#6EE7B7',
  '#B91C1C': '#FCA5A5',
  '#BE123C': '#FDA4AF',
  '#991B1B': '#FCA5A5',
};

export function useAccessibleStyles<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(base: T): T {
  const { isDark, fontScale } = useAccessibility();
  return useMemo(() => {
    const entries = Object.entries(base).map(([name, style]) => {
      const next: Record<string, unknown> = { ...(StyleSheet.flatten(style) ?? {}) };
      for (const [key, value] of Object.entries(next)) {
        if (typeof value === 'number' && (key === 'fontSize' || key === 'lineHeight')) {
          next[key] = Math.round(value * fontScale);
        }
        if (isDark && typeof value === 'string' &&
            (key === 'color' || key === 'backgroundColor' || key === 'borderColor')) {
          // Texto branco do botão primário deve continuar branco.
          if (key === 'color' && value.toUpperCase() === '#FFFFFF') continue;
          next[key] = DARK_PALETTE[value.toUpperCase()] ?? value;
        }
      }
      return [name, next];
    });
    return Object.fromEntries(entries) as T;
  }, [base, isDark, fontScale]);
}
