import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: { width: '100%' },
  primary: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  secondary: { backgroundColor: '#FFFFFF', borderColor: '#D8D2E2' },
  danger: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  text: { fontSize: 15, fontWeight: '800' },
  primaryText: { color: '#FFFFFF' },
  secondaryText: { color: '#5B21B6' },
  dangerText: { color: '#BE123C' },
  ghostText: { color: '#6B7280' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
});
