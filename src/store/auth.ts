import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OperatorSession {
  token: string;
  tenantId: string;
  operatorId: string;
  operatorName: string;
  roles: string[];
  expiresAtUnix: number;
}

interface AuthState {
  token: string;
  tenantId: string;
  operatorId: string;
  operatorName: string;
  roles: string[];
  expiresAtUnix: number;
  login: (session: OperatorSession) => void;
  logout: () => void;
}

const emptySession = {
  token: "",
  tenantId: "",
  operatorId: "",
  operatorName: "",
  roles: [] as string[],
  expiresAtUnix: 0,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...emptySession,
      login: (session) => set({ ...session }),
      logout: () => set({ ...emptySession }),
    }),
    { name: "ware-comanda.auth" },
  ),
);
