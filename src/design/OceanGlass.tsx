import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useAccessibility } from '../accessibility/AccessibilityContext';
import { getOceafinTheme, OCEAFIN } from './tokens';

type Material = 'navigation' | 'floating' | 'soft' | 'solid';
type Props = PropsWithChildren<{
  material?: Material;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  dark?: boolean;
  testID?: string;
}>;

/** One lightweight glass layer per surface, with deterministic opaque fallbacks. */
export function OceanGlass({ children, material = 'soft', style, radius = 20,
  dark = false, testID }: Props) {
  const { isDark, highContrast } = useAccessibility();
  const darkTheme = dark || isDark;
  const t = getOceafinTheme(darkTheme);
  const nav = material === 'navigation';
  const floating = material === 'floating';
  const solid = material === 'solid';
  const opaque = solid || highContrast;
  const blur = nav ? OCEAFIN.glass.navigationBlur :
    floating ? OCEAFIN.glass.floatingBlur : OCEAFIN.glass.softBlur;
  const background = opaque ? t.surface :
    darkTheme ? nav ? 'rgba(8,31,52,0.84)' : 'rgba(17,43,67,0.88)'
      : nav ? 'rgba(241,251,255,0.83)' : 'rgba(255,255,255,0.86)';
  const surface: ViewStyle = {
    backgroundColor: background, borderRadius: radius,
    borderWidth: 1,
    borderColor: darkTheme ? 'rgba(201,253,255,0.20)' : 'rgba(255,255,255,0.87)',
    overflow: 'hidden',
  };
  const webBlur = Platform.OS === 'web' && !opaque ? ({
    backdropFilter: 'blur(' + blur + 'px) saturate(165%)',
    WebkitBackdropFilter: 'blur(' + blur + 'px) saturate(165%)',
  } as unknown as ViewStyle) : undefined;
  const canNativeGlass = Platform.OS === 'ios' && !opaque && isLiquidGlassAvailable();
  const content = <View testID={testID} style={[styles.fill, surface, webBlur, style]}>{children}</View>;
  if (canNativeGlass) {
    return <GlassView glassEffectStyle="regular" style={[surface, style]}>{children}</GlassView>;
  }
  return content;
}

const styles = StyleSheet.create({ fill: { position: 'relative' } });
