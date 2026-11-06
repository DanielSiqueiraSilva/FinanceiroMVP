import { Platform } from 'react-native';

/** Preferência compartilhada entre o painel Aa (global) e as notificações. */
const KEY = '@finanmvp:som-notificacoes:v1';
const EVENT = 'finanmvp:som-notificacoes-alterado';

export function readSiteSoundEnabled(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(KEY) === 'true'; }
  catch { return false; }
}

export function writeSiteSoundEnabled(enabled: boolean): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, String(enabled)); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function observeSiteSoundEnabled(onChange: (enabled: boolean) => void): () => void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => {};
  const sync = () => onChange(readSiteSoundEnabled());
  window.addEventListener(EVENT, sync);
  window.addEventListener('storage', sync);
  return () => {
    window.removeEventListener(EVENT, sync);
    window.removeEventListener('storage', sync);
  };
}
