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
  // Server and the client's hydration pass must render the same mobile-first
  // structure. The real width is adopted immediately after hydration.
  return Platform.OS === 'web' ? (browserWidth > 0 ? browserWidth : 390) : width;
}
