import { useAuthStore } from "./store/auth";
import LoginScreen from "./components/auth/LoginScreen";
import PosScreen from "./components/pos/PosScreen";

export default function App() {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <LoginScreen />;
  }
  return <PosScreen />;
}
