import { LoginScreen } from "@kitchen/common";
import { fetchCashiers, loginWithPin, resolveTenantId } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

export default function ComandaLoginScreen() {
  const login = useAuthStore((s) => s.login);
  return (
    <LoginScreen
      title="MobiWare Comanda"
      subtitle="Mesero"
      operatorsAriaLabel="Operadores de sala"
      accentColor="emerald"
      tenantId={resolveTenantId()}
      fetchCashiers={fetchCashiers}
      loginWithPin={loginWithPin}
      onLoginSuccess={login}
    />
  );
}
