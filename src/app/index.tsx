import { ProtectedFinance } from '../components/auth/ProtectedFinance';
import { NotificationsProvider } from '../notifications/NotificationsContext';
import { FinanceWorkspace } from '../components/workspace/FinanceWorkspace';

export default function FinanceiroProtegido() {
  return (
    <ProtectedFinance>
      <NotificationsProvider>
        <FinanceWorkspace />
      </NotificationsProvider>
    </ProtectedFinance>
  );
}
