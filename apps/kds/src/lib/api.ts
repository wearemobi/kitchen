import {
  createApiClient,
  fetchCashiers as commonFetchCashiers,
  loginWithPin as commonLoginWithPin,
  resolveTenantId as commonResolveTenantId,
  type Cashier,
  type PinLoginResponse,
  type paths,
} from "@kitchen/common";
import { useAuthStore } from "../store/auth";

export const TENANT_STORAGE_KEY = "ware-kds.tenant";

export function resolveTenantId(): string {
  return commonResolveTenantId(TENANT_STORAGE_KEY);
}

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.MODE === "development" ? "" : "https://api.mobiware.app");

export const api = createApiClient({
  resolveTenantId,
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => useAuthStore.getState().logout(),
  baseUrl: API_BASE_URL,
});

export type { Cashier, PinLoginResponse };

export type BoardResponse =
  paths["/v1/kitchen/board"]["get"]["responses"]["200"]["content"]["application/json"];

export type Station = NonNullable<BoardResponse["stations"]>[number];

export type Ticket = NonNullable<Station["tickets"]>[number];

export type TicketItem = NonNullable<Ticket["items"]>[number];

export type TicketTransition = NonNullable<Ticket["available_transitions"]>[number];

export async function fetchCashiers(): Promise<Cashier[]> {
  return commonFetchCashiers(api, resolveTenantId());
}

export async function loginWithPin(username: string, pin: string): Promise<PinLoginResponse> {
  return commonLoginWithPin(api, resolveTenantId(), username, pin);
}

export async function fetchBoard(): Promise<BoardResponse> {
  const { data, error } = await api.GET("/v1/kitchen/board", {
    params: { header: { "X-Tenant-Id": resolveTenantId() } },
  });
  if (error || !data) {
    throw new Error("No fue posible cargar el tablero de cocina.");
  }
  return data;
}

export async function fireTransition(
  ticketId: string,
  actionKey: string,
  operatorId: string,
  operatorName: string,
): Promise<void> {
  const { error } = await api.POST("/v1/kitchen/tickets/{id}/transitions", {
    params: { path: { id: ticketId }, header: { "X-Tenant-Id": resolveTenantId() } },
    body: { action_key: actionKey, operator_id: operatorId, operator_name: operatorName },
  });
  if (error) {
    throw new Error("La transición fue rechazada por el servidor.");
  }
}
