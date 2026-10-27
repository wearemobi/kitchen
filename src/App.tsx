import { useAuthStore } from "./store/auth";
import LoginScreen from "./components/auth/LoginScreen";
import KdsScreen from "./components/kds/KdsScreen";

export default function App() {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <LoginScreen />;
  }
  return <KdsScreen />;
}
