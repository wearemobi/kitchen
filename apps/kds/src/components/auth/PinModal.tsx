import { PinModal, type PinModalProps } from "@kitchen/common";
import { loginWithPin, resolveTenantId } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

export { PIN_LENGTH } from "@kitchen/common";

export default function KdsPinModal(
  props: Omit<PinModalProps, "tenantId" | "onLoginSuccess" | "loginWithPin" | "accentColor">,
) {
  const login = useAuthStore((s) => s.login);
  return (
    <PinModal
      {...props}
      tenantId={resolveTenantId()}
      accentColor="amber"
      loginWithPin={loginWithPin}
      onLoginSuccess={login}
    />
  );
}
