import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Animated, Easing, Platform,
  Pressable, StyleSheet, Text, View,
  type StyleProp, type ViewStyle,
} from 'react-native';
import { useAccessibility } from '../accessibility/AccessibilityContext';
import { getOceafinTheme, OCEAFIN } from './tokens';
import { OceanGlass } from './OceanGlass';
import { WorkspaceIcon, type WorkspaceIconName } from './brand';

export type OceanButtonVariant = 'primary' | 'glass' | 'icon' | 'danger';
type Props = {
  label: string;
  onPress: () => void;
  variant?: OceanButtonVariant;
  icon?: WorkspaceIconName;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
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
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (live) setSystem(value);
    }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged',
      value => setSystem(value));
    return () => { live = false; listener.remove(); };
  }, []);
  return reduceMotion || system;
}

export function OceanButton({
  label, onPress, variant = 'primary', icon, disabled = false, loading = false,
  selected = false, style, testID, accessibilityHint, children,
}: Props) {
  const { isDark } = useAccessibility();
  const t = getOceafinTheme(isDark);
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [scale] = useState(() => new Animated.Value(1));
  const isDisabled = disabled || loading;
  const isIcon = variant === 'icon';
  const isGlass = variant === 'glass' || isIcon;
  const danger = variant === 'danger';
  const activeTint = danger ? '#A94345' : '#087FA5';
  const contentColor = isGlass ? t.text : '#FFFFFF';
  useEffect(() => {
    const animation = Animated.timing(scale, {
      toValue: pressed && !isDisabled && !reduced ? 0.98 : 1,
      duration: reduced ? 0 : pressed ? 130 : 170,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [scale, pressed, reduced, isDisabled]);
  const container: ViewStyle = {
    minHeight: isIcon ? 44 : 46,
    minWidth: isIcon ? 44 : undefined,
    paddingHorizontal: isIcon ? 10 : 17,
    borderRadius: isIcon ? 14 : 15,
    flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 9,
    backgroundColor: isGlass ? 'transparent' : activeTint,
    borderWidth: 1,
    borderColor: isGlass
      ? focused ? t.link : hovered || selected ? 'rgba(51,213,217,.72)' : t.border
      : focused ? '#C6FDFF' : hovered ? '#76E7E9' : 'rgba(205,255,255,.32)',
    opacity: isDisabled ? 0.56 : 1,
  };
  const content = (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading, selected }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[container, { backgroundColor: isGlass ? 'transparent' : activeTint },
        focused && styles.focused, pressed && styles.pressed, style]}
    >
      {loading && <ActivityIndicator size="small" color={contentColor} />}
      {icon && !loading && <WorkspaceIcon name={icon} size={isIcon ? 22 : 19} color={contentColor} />}
      {children || (!isIcon && <Text numberOfLines={2} style={[styles.label, {
        color: contentColor, fontFamily: Platform.OS === 'web' ? 'Inter' : undefined,
      }]}>{label}</Text>)}
    </Pressable>
  );
  return (
    <Animated.View style={[{ transform: [{ scale }] }, isIcon && styles.iconWrap]}>
      {isGlass ? <OceanGlass material="button" radius={isIcon ? 14 : 15}>
        {content}
      </OceanGlass> : content}
    </Animated.View>
  );
}

export function OceanIconButton(props: Omit<Props, 'variant'>) {
  return <OceanButton {...props} variant="icon" />;
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
      toValue: next, duration: reduced ? 0 : 290,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [value, options, reduced, index]);
  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={[
      styles.segmentTrack, { backgroundColor: t.surfaceSubtle, borderColor: t.border },
    ]}>
      {width > 0 && <Animated.View pointerEvents="none" style={[
        styles.segmentLens, { width: step, backgroundColor: t.selected,
          borderColor: isDark ? 'rgba(51,213,217,.45)' : 'rgba(8,127,165,.36)' },
        { transform: [{ translateX: Animated.multiply(index, step) }] },
      ]} />}
      {options.map(item => (
        <Pressable key={item.value} accessibilityRole="tab"
          accessibilityState={{ selected: value === item.value, disabled }}
          accessibilityLabel={item.label}
          disabled={disabled} onPress={() => onChange(item.value)}
          style={styles.segmentItem}>
          <Text numberOfLines={2} style={[styles.segmentText, {
            color: value === item.value ? t.text : t.muted,
          }]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  iconWrap: { alignSelf: 'flex-start' },
  focused: { borderWidth: 2 },
  pressed: { opacity: 0.93 },
  segmentTrack: { flexDirection: 'row', borderWidth: 1,
    borderRadius: 16, overflow: 'hidden', padding: 3, minHeight: 46 },
  segmentLens: { position: 'absolute', left: 0, top: 3, bottom: 3,
    borderWidth: 1, borderRadius: 13 },
  segmentItem: { minHeight: 40, minWidth: 0, flex: 1,
    alignItems: 'center', justifyContent: 'center', zIndex: 1, paddingHorizontal: 5 },
  segmentText: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
});
