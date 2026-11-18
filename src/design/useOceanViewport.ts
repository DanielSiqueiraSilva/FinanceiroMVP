import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Real browser viewport width for responsive Oceafin layouts.
 * Expo Web can hydrate with stale React Native Dimensions after desktop
 * resize. The resize event keeps the breakpoint in sync without reload.
 * On iOS/Android the native hook remains authoritative.
 */
export function useOceanViewport() {
  const { width } = useWindowDimensions();
  const [browserWidth, setBrowserWidth] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const sync = () => setBrowserWidth(window.innerWidth);
    sync();
    window.addEventListener('resize', sync, { passive: true });
    return () => window.removeEventListener('resize', sync);
  }, []);

  return Platform.OS === 'web' && browserWidth !== null ? browserWidth : width;
}
