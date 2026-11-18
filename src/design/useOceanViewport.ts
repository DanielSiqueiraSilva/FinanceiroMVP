import { useSyncExternalStore } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Browser layout width independent from the initial Expo Web SSR dimensions.
 * Resize subscriptions also cover desktop devtools/mobile emulation without reload.
 */
const subscribe = (callback: () => void) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => {};
  window.addEventListener('resize', callback, { passive: true });
  return () => window.removeEventListener('resize', callback);
};
const getBrowserWidth = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.innerWidth : 0;
const getServerWidth = () => 0;

export function useOceanViewport() {
  const { width } = useWindowDimensions();
  const browserWidth = useSyncExternalStore(subscribe, getBrowserWidth, getServerWidth);
  return Platform.OS === 'web' && browserWidth > 0 ? browserWidth : width;
}
