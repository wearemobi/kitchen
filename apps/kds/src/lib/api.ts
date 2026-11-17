import createClient from "openapi-fetch";
import type { paths } from "./schema";
import { useAuthStore } from "../store/auth";

export const TENANT_STORAGE_KEY = "ware-kds.tenant";
const DEFAULT_TENANT_ID = "tenant_demo_sv";

export function resolveTenantId(): string {
  if (typeof window === "undefined") return DEFAULT_TENANT_ID;
  const fromUrl = new URLSearchParams(window.location.search).get("t");
  if (fromUrl) {
    window.localStorage.setItem(TENANT_STORAGE_KEY, fromUrl);
    return fromUrl;
  }
  return window.localStorage.getItem(TENANT_STORAGE_KEY) ?? DEFAULT_TENANT_ID;
}

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://api.mobiware.app";

export const api = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: (input: Request) => globalThis.fetch(input),
});

api.use({
  onRequest({ request }) {
    const tenantId = resolveTenantId();
    if (tenantId) {
      request.headers.set("X-Tenant-Id", tenantId);
    }
    const token = useAuthStore.getState().token;
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
});

export type Cashier = NonNullable<
  paths["/v1/auth/cashiers"]["get"]["responses"]["200"]["content"]["application/json"]["cashiers"]
>[number];

export type PinLoginResponse =
  paths["/v1/auth/login-pin"]["post"]["responses"]["200"]["content"]["application/json"];

export type BoardResponse =
  paths["/v1/kitchen/board"]["get"]["responses"]["200"]["content"]["application/json"];

export type Station = NonNullable<BoardResponse["stations"]>[number];

export type Ticket = NonNullable<Station["tickets"]>[number];

export type TicketItem = NonNullable<Ticket["items"]>[number];

export type TicketTransition = NonNullable<Ticket["available_transitions"]>[number];

export async function fetchCashiers(): Promise<Cashier[]> {
  const { data, error } = await api.GET("/v1/auth/cashiers", {
    params: { header: { "X-Tenant-Id": resolveTenantId() } },
  });
  if (error || !data) {
    throw new Error("No fue posible cargar los operadores de este tenant.");
  }
  return data.cashiers ?? [];
}

export async function loginWithPin(username: string, pin: string): Promise<PinLoginResponse> {
  const { data, error, response } = await api.POST("/v1/auth/login-pin", {
    params: { header: { "X-Tenant-Id": resolveTenantId() } },
    body: { username, pin },
  });
  if (error || !data) {
    const detail =
      response.status === 401 ? "PIN incorrecto para este operador." : "No fue posible iniciar sesión.";
    throw new Error(detail);
  }
  return data;
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
