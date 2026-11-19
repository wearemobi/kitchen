import { useSatelliteTheme } from "@kitchen/common";
import { useAuthStore } from "./store/auth";
import LoginScreen from "./components/auth/LoginScreen";
import PosScreen from "./components/pos/PosScreen";

export default function App() {
  const token = useAuthStore((s) => s.token);
  const { theme, toggleTheme } = useSatelliteTheme("ware-comanda.theme");

  if (!token) {
    return <LoginScreen />;
  }
  return <PosScreen theme={theme} onToggleTheme={toggleTheme} />;
}
