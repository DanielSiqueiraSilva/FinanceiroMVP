import { Children, isValidElement, useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Animated, Easing, Platform,
  Pressable, StyleSheet, Text, View,
  type PressableProps, type PressableStateCallbackType,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { useAccessibility } from '../accessibility/AccessibilityContext';
import { getOceafinTheme, OCEAFIN } from './tokens';
import { OceanGlass } from './OceanGlass';
import { WorkspaceIcon, type WorkspaceIconName } from './brand';

/** Minimal ocean-tinted glass inspired by the approved crystal-button study. */
export type OceanButtonVariant = 'primary' | 'glass' | 'icon' | 'danger' | 'quiet';
type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: OceanButtonVariant;
  icon?: WorkspaceIconName;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
  children?: ReactNode;
};

function useReducedMotion() {
  const { reduceMotion } = useAccessibility();
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(value => { if (live) setSystem(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged',
      value => setSystem(value));
    return () => { live = false; listener.remove(); };
  }, []);
  return reduceMotion || system;
}

/**
 * Only inspect a button's direct text label. Nested text inside complex list cards
 * or a notification badge must never recolor the entire interactive card.
 * Legacy components use explicit React Native Text colors, so inherited CSS ink
 * cannot fix an unreadable white label by itself.
 */
function directButtonLabelColor(children: ReactNode): string | null {
  for (const node of Children.toArray(children)) {
    if (!isValidElement<{ style?: StyleProp<TextStyle> }>(node) || node.type !== Text) continue;
    const color = StyleSheet.flatten(node.props.style)?.color;
    if (typeof color === 'string') return color.toUpperCase();
  }
  return null;
}
function nearWhiteLabel(color: string | null): boolean {
  if (!color) return false;
  if (['#FFFFFF','#F8FAFC','#EFFCFF','#E8FFFF','#F2FFFF','#F5FFFF'].includes(color)) return true;
  const match = color.match(/^#([A-F0-9]{6})$/);
  if (!match) return false;
  const channels = [0,2,4].map(i => parseInt(match[1].slice(i,i+2),16));
  return channels.every(n => n >= 222);
}

/** Pressable with theme-aware glass physics; keep legacy label contrast intact. */
export function OceanPressable({
  style, accessibilityRole, accessibilityState, disabled,
  onHoverIn, onHoverOut, onFocus, onBlur,
  children, oceanTone = 'auto', ...rest
}: PressableProps & { oceanTone?: 'auto' | 'primary' | 'glass' | 'danger' | 'quiet' | 'none' }) {
  const { isDark } = useAccessibility();
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const interactive = accessibilityRole === 'button' ||
    accessibilityRole === 'tab' || accessibilityRole === 'radio';
  const surface = (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
    const original = typeof style === 'function' ? style(state) : style;
    const flat = StyleSheet.flatten(original) || {};
    if (!interactive || oceanTone === 'none' || flat.position === 'absolute')
      return original;
    const raw = typeof flat.backgroundColor === 'string' ?
      flat.backgroundColor.toUpperCase() : '';
    const selected = accessibilityState?.selected === true ||
      accessibilityState?.checked === true;
    const foreground = directButtonLabelColor(children);
    const needsSolidForLegibility = !isDark && nearWhiteLabel(foreground);
    const solidDanger = ['#B91C1C','#991B1B','#A94345','#FCA5A5',
      '#A22E49','#BE123C'].includes(raw);
    const isDanger = oceanTone === 'danger' || solidDanger ||
      ['#FFF1F2','#FFF0F0','#3D2028'].includes(raw);
    const originalPrimary = ['#7C3AED','#087F95','#0077C8','#0C879A',
      '#0D8A9F','#5B21B6','#8557F5','#08677B','#0A7083','#0B7186'].includes(raw);
    // Primary surfaces are only forced dark in light mode if the label is light.
    // Dark-ink legacy chips on an ocean background must use light glass instead.
    const isPrimary = oceanTone === 'primary' ||
      (oceanTone === 'auto' && (needsSolidForLegibility && !isDanger ||
        originalPrimary && (isDark || needsSolidForLegibility)));
    const hasBackground = !!raw && raw !== 'TRANSPARENT';
    const hasSurface = hasBackground || (typeof flat.borderWidth === 'number' && flat.borderWidth > 0);
    const reducedAlpha = disabled ? Math.min(0.65, flat.opacity ?? 1) : flat.opacity;
    const pressTransform = state.pressed && !reduced && !disabled
      ? [...(Array.isArray(flat.transform) ? flat.transform : []),
          { perspective: 600 }, { scale: OCEAFIN.button.pressScale },
          { rotateX: OCEAFIN.button.pressTiltDegrees + 'deg' }]
      : flat.transform;
    const subtleTransition = Platform.OS === 'web' ? ({
      transition: reduced ? 'none' :
        'background-color 180ms, border-color 180ms, box-shadow 180ms, transform 220ms cubic-bezier(.25,1,.5,1)',
    } as unknown as ViewStyle) : undefined;
    // Text-only links, modal scrims, and icon actions must not become opaque pill cards.
    if (!hasSurface && oceanTone === 'auto' && !needsSolidForLegibility) {
      return [original, {
        minHeight: Math.max(44, typeof flat.minHeight === 'number' ? flat.minHeight : 0),
        opacity: reducedAlpha, transform: pressTransform,
        ...(focused ? { borderRadius: 12, borderWidth: 1,
          borderColor: isDark ? '#A5F5F1' : '#167D8E' } : {}),
      }, subtleTransition];
    }
    // White legacy labels require an opaque ocean/deep rose surface for WCAG contrast.
    // Selected chips keep their own palette and do not inherit another mismatched text color.
    const base = solidDanger || (isDanger && needsSolidForLegibility)
      ? (isDark ? OCEAFIN.button.solidDangerDark : OCEAFIN.button.solidDangerLight)
      : isPrimary ? (isDark ? OCEAFIN.button.solidPrimaryDark : OCEAFIN.button.solidPrimaryLight)
      : oceanTone === 'quiet' ? 'transparent'
      : selected && hasBackground ? flat.backgroundColor
      : selected ? (isDark ? 'rgba(35,115,132,.60)' : 'rgba(96,200,205,.28)')
      : isDanger ? (isDark ? 'rgba(153,65,87,.30)' : 'rgba(207,92,119,.14)')
      : oceanTone === 'glass' || hasSurface
        ? (isDark ? OCEAFIN.button.darkGlass : OCEAFIN.button.lightGlass)
        : 'transparent';
    const border = focused ? (isDark ? '#B8FFF8' : '#087D89')
      : isDanger ? isDark ? 'rgba(254,192,204,.56)' : 'rgba(178,69,91,.40)'
      : hovered || selected ? isDark ? 'rgba(165,248,243,.64)' : 'rgba(43,146,159,.50)'
      : isDark ? OCEAFIN.button.darkBorder : 'rgba(119,184,196,.38)';
    const feedback: ViewStyle = {
      backgroundColor: base, borderColor: border, borderWidth: 1,
      borderRadius: isPrimary || solidDanger || (isDanger && needsSolidForLegibility) ||
        (typeof flat.paddingHorizontal === 'number' && flat.paddingHorizontal >= 9 &&
          flat.width === undefined && flat.height === undefined)
          ? OCEAFIN.button.radius
          : typeof flat.borderRadius === 'number' ? Math.max(12,flat.borderRadius) : 14,
      minHeight: Math.max(44, typeof flat.minHeight === 'number' ? flat.minHeight : 0),
      opacity: reducedAlpha, transform: pressTransform,
    };
    const webGlass = Platform.OS === 'web' ? ({
      ...(subtleTransition || {}),
      backdropFilter: 'blur(' + OCEAFIN.glass.buttonBlur + 'px) saturate(125%)',
      WebkitBackdropFilter: 'blur(' + OCEAFIN.glass.buttonBlur + 'px) saturate(125%)',
      boxShadow: state.pressed ?
        'inset 0 3px 6px rgba(0,29,39,.13)' :
        isDark
          ? 'inset 0 1px 0 rgba(255,255,255,.20), inset 0 -1px 0 rgba(0,0,0,.10), 0 3px 10px rgba(0,12,25,.10)'
          : 'inset 0 1px 0 rgba(255,255,255,.85), inset 0 -1px 0 rgba(45,95,110,.08), 0 3px 10px rgba(39,89,104,.08)',
    } as unknown as ViewStyle) : undefined;
    return [original, feedback, webGlass];
  };
  return <Pressable {...rest} accessibilityRole={accessibilityRole}
    accessibilityState={accessibilityState} disabled={disabled}
    onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={surface}>{children}</Pressable>;
}

/** Unified premium button for primary/secondary/critical actions. */
export function OceanButton({
  label, onPress, variant = 'primary', icon, disabled = false, loading = false,
  selected = false, fullWidth = false, style, testID, accessibilityHint, children,
}: ButtonProps) {
  const { isDark } = useAccessibility();
  const theme = getOceafinTheme(isDark);
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const isDisabled = disabled || loading;
  const isIcon = variant === 'icon';
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: pressed && !isDisabled && !reduced ? 1 : 0,
      duration: reduced ? 0 : pressed ? 110 : 280,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, pressed, isDisabled, reduced]);
  const transform = [
    { perspective: 650 },
    { scale: progress.interpolate({ inputRange: [0,1], outputRange: [1,OCEAFIN.button.pressScale] }) },
    { rotateX: progress.interpolate({ inputRange: [0,1], outputRange: ['0deg', OCEAFIN.button.pressTiltDegrees + 'deg'] }) },
  ];
  const contentColor = isDanger ? (isDark ? '#FFDDE5' : '#81374B')
    : isDark ? '#EFFCFF' : '#103D4B';
  const background = isDanger
    ? isDark ? 'rgba(169,70,95,.24)' : 'rgba(214,95,117,.14)'
    : isPrimary ? isDark ? OCEAFIN.button.darkTint : OCEAFIN.button.lightTint
    : selected ? isDark ? 'rgba(90,213,216,.22)' : 'rgba(75,191,199,.23)'
    : 'transparent';
  const border = focused ? '#72E2DF' :
    hovered ? isDark ? '#9DF4EC' : '#4DAEB9' :
      isDanger ? isDark ? 'rgba(255,173,192,.55)' : 'rgba(177,81,106,.38)' :
        isDark ? OCEAFIN.button.darkBorder : 'rgba(104,164,178,.35)';
  return <Animated.View style={[
    { transform, opacity: isDisabled ? 0.48 : 1 },
    fullWidth && { width: '100%', alignSelf: 'stretch' },
    style,
  ]}>
    <OceanGlass material="button" radius={OCEAFIN.button.radius}>
      <Pressable
        testID={testID} accessibilityRole="button" accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading, selected }}
        disabled={isDisabled} onPress={onPress}
        onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}
        onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={[styles.button,
          isIcon && styles.icon,
          { backgroundColor: background, borderColor: border,
            minHeight: isIcon ? 44 : OCEAFIN.button.height },
        ]}>
        <View pointerEvents="none" style={[styles.glint,
          { backgroundColor: isDark ? 'rgba(238,255,255,.20)' : 'rgba(255,255,255,.55)' }]} />
        {loading && <ActivityIndicator size="small" color={contentColor}/>}
        {icon && !loading && <WorkspaceIcon name={icon} size={isIcon ? 21 : 18}
          color={contentColor}/>}
        {children || (!isIcon && <Text numberOfLines={2}
          style={[styles.label, { color: contentColor,
            fontFamily: Platform.OS === 'web' ? 'Inter' : undefined }]}>
          {label}</Text>)}
      </Pressable>
    </OceanGlass>
  </Animated.View>;
}
export function OceanIconButton(props: Omit<ButtonProps,'variant'>) {
  return <OceanButton {...props} variant="icon"/>;
}
type SegmentOption<T extends string> = { value: T; label: string };
export function OceanSegmentedControl<T extends string>({
  value, options, onChange, disabled = false,
}: {
  value: T; options: readonly SegmentOption<T>[];
  onChange: (value: T) => void; disabled?: boolean;
}) {
  const { isDark } = useAccessibility();
  const t = getOceafinTheme(isDark);
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [index] = useState(() => new Animated.Value(Math.max(0, options.findIndex(x => x.value === value))));
  const step = width / Math.max(1, options.length);
  useEffect(() => {
    const next = Math.max(0, options.findIndex(x => x.value === value));
    const a = Animated.timing(index, {
      toValue: next, duration: reduced ? 0 : 460,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [value, options, reduced, index]);
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)}
    style={[styles.segmentTrack, {
      backgroundColor: isDark ? 'rgba(170,224,239,.08)' : 'rgba(255,255,255,.40)',
      borderColor: t.border,
    }]}>
    {width > 0 && <Animated.View pointerEvents="none" style={[
      styles.segmentLens, { width: step,
        backgroundColor: isDark ? 'rgba(101,211,213,.28)' : 'rgba(93,198,202,.27)',
        borderColor: isDark ? 'rgba(192,252,249,.53)' : 'rgba(255,255,255,.96)' },
      { transform: [{ translateX: Animated.multiply(index,step) }] },
    ]} />}
    {options.map(item => <Pressable key={item.value} accessibilityRole="tab"
      accessibilityState={{ selected: value === item.value, disabled }}
      accessibilityLabel={item.label} disabled={disabled}
      onPress={() => onChange(item.value)} style={styles.segmentItem}>
      <Text numberOfLines={2} style={[styles.segmentText,
        { color: value === item.value ? t.text : t.muted }]}>{item.label}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  button: { width: '100%', minHeight: 46, paddingHorizontal: 18,
    paddingVertical: 10, borderRadius: 999, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, overflow: 'hidden' },
  icon: { minWidth: 44, paddingHorizontal: 10 },
  glint: { position: 'absolute', left: 20, right: 20, top: 0, height: 1,
    borderRadius: 99 },
  label: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  segmentTrack: { flexDirection: 'row', borderWidth: 1,
    borderRadius: 999, overflow: 'hidden', padding: 4, minHeight: 48 },
  segmentLens: { position: 'absolute', left: 0, top: 4, bottom: 4,
    borderWidth: 1, borderRadius: 999 },
  segmentItem: { minHeight: 40, minWidth: 0, flex: 1,
    alignItems: 'center', justifyContent: 'center', zIndex: 1, paddingHorizontal: 5 },
  segmentText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
