import { LoginScreen } from "@kitchen/common";
import { fetchCashiers, loginWithPin, resolveTenantId } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

export default function KdsLoginScreen() {
  const login = useAuthStore((s) => s.login);
  return (
    <LoginScreen
      title="MobiWare KDS"
      subtitle="Estación de cocina"
      operatorsAriaLabel="Operadores de cocina"
      accentColor="amber"
      tenantId={resolveTenantId()}
      fetchCashiers={fetchCashiers}
      loginWithPin={loginWithPin}
      onLoginSuccess={login}
    />
  );
}
