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

export interface Business {
  id?: string;
  tenant_id?: string;
  name?: string;
  display_prefix?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export const BUSINESS_STORAGE_PREFIX = "ware-kitchen.businessId.";

export function urlBusinessId(): string {
  if (typeof window === "undefined") return "";
  try {
    return (new URLSearchParams(window.location.search).get("b") ?? "").trim();
  } catch {
    return "";
  }
}

export function storedBusinessId(tenantId = resolveTenantId()): string {
  if (!tenantId) return "";
  try {
    return (window.localStorage.getItem(`${BUSINESS_STORAGE_PREFIX}${tenantId}`) ?? "").trim();
  } catch {
    return "";
  }
}

export function storeBusinessId(businessId: string, tenantId = resolveTenantId()): void {
  if (!tenantId) return;
  try {
    if (businessId) {
      window.localStorage.setItem(`${BUSINESS_STORAGE_PREFIX}${tenantId}`, businessId);
    } else {
      window.localStorage.removeItem(`${BUSINESS_STORAGE_PREFIX}${tenantId}`);
    }
  } catch {
    // restricted storage: selection remains in component state
  }
}

export async function fetchBusinesses(): Promise<Business[]> {
  const { data, error } = await (
    api as unknown as {
      GET: (
        url: string,
        opts: { params: { header: { "X-Tenant-Id": string } } },
      ) => Promise<{ data?: Business[] | { items?: Business[] }; error?: unknown }>;
    }
  ).GET("/v1/orders/businesses", {
    params: { header: { "X-Tenant-Id": resolveTenantId() } },
  });
  if (error) {
    throw new Error("No se pudieron cargar los negocios del tenant.");
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/** `?b=` wins, then the persisted selection, then the first business. */
export async function resolveBusinessId(preferredId?: string): Promise<string> {
  const tenantId = resolveTenantId();
  const preferred = (preferredId ?? urlBusinessId()).trim();
  const businesses = await fetchBusinesses();
  const chosen =
    businesses.find((business) => business.id === preferred)?.id ??
    businesses.find((business) => business.id === storedBusinessId(tenantId))?.id ??
    businesses[0]?.id;
  if (!chosen) {
    throw new Error("No se encontró un negocio configurado para este tenant.");
  }
  storeBusinessId(chosen, tenantId);
  return chosen;
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

export async function fetchBoard(businessId?: string | null): Promise<BoardResponse> {
  const business = (businessId ?? "").trim();
  const { data, error } = await api.GET("/v1/kitchen/board", {
    params: {
      header: { "X-Tenant-Id": resolveTenantId() },
      query: business ? { business_id: business } : {},
    },
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
