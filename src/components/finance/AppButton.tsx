import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { AppColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
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
    primary: { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong },
    secondary: { backgroundColor: colors.surface, borderColor: colors.border },
    danger: { backgroundColor: colors.negativeSoftBg, borderColor: colors.negativeSoftBorder },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
    text: { fontSize: 15, fontWeight: '800' },
    primaryText: { color: colors.onAccent },
    secondaryText: { color: colors.accentSoftText },
    dangerText: { color: colors.negative },
    ghostText: { color: colors.textSecondary },
    pressed: { opacity: 0.82 },
    disabled: { opacity: 0.5 },
  });
}
