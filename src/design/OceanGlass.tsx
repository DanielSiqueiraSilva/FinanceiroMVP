import { useEffect, useState, type PropsWithChildren } from 'react';
import {
  AccessibilityInfo, Platform, StyleSheet, View,
  type ViewStyle, type StyleProp,
} from 'react-native';
import {
  GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { useAccessibility } from '../accessibility/AccessibilityContext';
import { getOceafinTheme, OCEAFIN } from './tokens';

export type OceanMaterial = 'navigation' | 'floating' | 'button' | 'soft' | 'hero' | 'solid';
type Props = PropsWithChildren<{
  material?: OceanMaterial;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  dark?: boolean;
  testID?: string;
}>;

function useGlassCapabilities() {
  // The conservative first render is deterministic on Expo Router SSR.
  const [webBlur, setWebBlur] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    let active = true;
    if (Platform.OS === 'web') {
      const supported = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' &&
        (CSS.supports('backdrop-filter', 'blur(8px)') ||
          CSS.supports('-webkit-backdrop-filter', 'blur(8px)'));
      setWebBlur(supported);
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const media = window.matchMedia('(prefers-reduced-transparency: reduce)');
      const contrast = window.matchMedia('(forced-colors: active)');
      const check = () => { if (active) setReduceTransparency(media.matches || contrast.matches); };
      check();
      media.addEventListener?.('change', check);
      contrast.addEventListener?.('change', check);
      return () => {
        active = false;
        media.removeEventListener?.('change', check);
        contrast.removeEventListener?.('change', check);
      };
    }
    if (typeof AccessibilityInfo.isReduceTransparencyEnabled === 'function') {
      void AccessibilityInfo.isReduceTransparencyEnabled()
        .then(value => { if (active) setReduceTransparency(value); }).catch(() => {});
    }
    return () => { active = false; };
  }, []);
  return { webBlur, reduceTransparency };
}

/**
 * Material system from the approved Oceafin guide.
 * Blur is always applied to the surface behind the foreground content.
 * No blur is applied to children or financial values.
 */
export function OceanGlass({
  children, material = 'soft', style, radius = 20, dark = false, testID,
}: Props) {
  const { isDark, highContrast } = useAccessibility();
  const { webBlur, reduceTransparency } = useGlassCapabilities();
  const darkTheme = dark || isDark;
  const theme = getOceafinTheme(darkTheme);
  const opaque = highContrast || reduceTransparency || material === 'solid' ||
    material === 'hero';
  const intensity = material === 'navigation' ? OCEAFIN.glass.navigationBlur :
    material === 'floating' ? OCEAFIN.glass.floatingBlur :
      material === 'button' ? 12 : OCEAFIN.glass.softBlur;
  const useWebBackdrop = Platform.OS === 'web' && !opaque && webBlur;
  const backgroundColor = opaque || (Platform.OS === 'web' && !webBlur) ?
    (darkTheme ? '#102E48' : '#F5FAFD') :
    darkTheme ?
      (material === 'navigation' ? 'rgba(8,31,52,0.64)' :
        material === 'button' ? 'rgba(22,67,93,0.64)' : 'rgba(15,45,68,0.70)') :
      (material === 'navigation' ? 'rgba(247,252,255,0.73)' :
        material === 'button' ? 'rgba(245,251,255,0.70)' : 'rgba(255,255,255,0.76)');
  const surface: ViewStyle = {
    position: 'relative', borderRadius: radius, overflow: 'hidden',
    borderWidth: 1,
    borderColor: darkTheme ? 'rgba(182,248,252,0.33)' : 'rgba(255,255,255,0.88)',
    backgroundColor,
  };
  const webStyling = Platform.OS === 'web' ? ({
    ...(useWebBackdrop ? {
      backdropFilter: 'blur(' + intensity + 'px) saturate(135%)',
      WebkitBackdropFilter: 'blur(' + intensity + 'px) saturate(135%)',
    } : {}),
    boxShadow: darkTheme
      ? 'inset 0 1px 0 rgba(228,255,255,.17), 0 14px 32px rgba(1,12,34,.20)'
      : 'inset 0 1px 0 rgba(255,255,255,.92), 0 12px 28px rgba(10,55,82,.12)',
  } as unknown as ViewStyle) : undefined;
  const nativeGlass = Platform.OS === 'ios' && !opaque &&
    isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  if (nativeGlass) {
    return <GlassView testID={testID} glassEffectStyle="regular"
      style={[surface, { backgroundColor: 'transparent' }, style]}>
      {children}
    </GlassView>;
  }
  return (
    <View testID={testID} style={[surface, webStyling, style]}>
      {!opaque && <View pointerEvents="none" style={[
        styles.specularEdge,
        { backgroundColor: darkTheme ? 'rgba(212,255,255,.21)' : 'rgba(255,255,255,.91)' },
      ]} />}
      {!opaque && <View pointerEvents="none" style={[
        styles.sideLight,
        { borderLeftColor: darkTheme ? 'rgba(147,237,244,.10)' : 'rgba(255,255,255,.70)' },
      ]} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  specularEdge: { position: 'absolute', left: 18, right: 18, height: 1, top: 0, zIndex: 0 },
  sideLight: { position: 'absolute', left: 0, top: 14, bottom: 14,
    width: 2, borderLeftWidth: 1, zIndex: 0 },
});
