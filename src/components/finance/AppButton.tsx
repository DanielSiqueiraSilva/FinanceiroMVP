import { ViewStyle } from 'react-native';
import { useNotifications } from '../../notifications/NotificationsContext';
import { OceanButton } from '../../design/OceanControls';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Props = { title: string; onPress: () => void; variant?: ButtonVariant;
  disabled?: boolean; fullWidth?: boolean; style?: ViewStyle };
/** Backward-compatible façade so existing form handlers remain unchanged. */
export function AppButton({ title, onPress, variant = 'primary',
  disabled = false, fullWidth = false, style }: Props) {
  const notifications = useNotifications();
  return <OceanButton label={title}
    variant={variant === 'secondary' ? 'glass' : variant === 'ghost' ? 'quiet' : variant}
    disabled={disabled} fullWidth={fullWidth} style={style}
    onPress={() => { notifications?.click(); onPress(); }}/>;
}
