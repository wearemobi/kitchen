import { createAuthStore } from "@kitchen/common";
export type { OperatorSession } from "@kitchen/common";

export const useAuthStore = createAuthStore("ware-comanda.auth");
