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

export const TENANT_STORAGE_KEY = "ware-comanda.tenant";

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

export type Product = NonNullable<
  paths["/v1/inventory/products"]["get"]["responses"]["200"]["content"]["application/json"]["items"]
>[number];

export type Order = paths["/v1/orders"]["post"]["responses"]["201"]["content"]["application/json"];

export async function fetchCashiers(): Promise<Cashier[]> {
  return commonFetchCashiers(api, resolveTenantId());
}

export async function loginWithPin(username: string, pin: string): Promise<PinLoginResponse> {
  return commonLoginWithPin(api, resolveTenantId(), username, pin);
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await api.GET("/v1/inventory/products", {
    params: { header: { "X-Tenant-Id": resolveTenantId() }, query: { size: 200, sort: "name,asc" } },
  });
  if (error || !data) {
    throw new Error("No fue posible cargar el catálogo de productos.");
  }
  return data.items ?? [];
}

const businessIdCache = new Map<string, string>();

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
    // restricted storage: in-memory cache still applies
  }
}

export async function fetchBusinesses(): Promise<Business[]> {
  const tenantId = resolveTenantId();
  const { data, error } = await (
    api as unknown as {
      GET: (
        url: string,
        opts: { params: { header: { "X-Tenant-Id": string } } },
      ) => Promise<{ data?: Business[] | { items?: Business[] }; error?: unknown }>;
    }
  ).GET("/v1/orders/businesses", {
    params: { header: { "X-Tenant-Id": tenantId } },
  });
  if (error) {
    throw new Error("No se pudieron cargar los negocios del tenant.");
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/**
 * Resolves the active business honouring `?b=<business_id>` (SPEC-KSAT3),
 * then the per-tenant persisted selection, then the first business.
 */
export async function resolveBusinessId(preferredId?: string): Promise<string> {
  const envBusinessId = (import.meta.env.VITE_BUSINESS_ID as string | undefined)?.trim();
  if (envBusinessId) {
    return envBusinessId;
  }

  const tenantId = resolveTenantId();
  const preferred = (preferredId ?? urlBusinessId()).trim();
  const businesses = await fetchBusinesses();
  const chosen =
    businesses.find((business) => business.id === preferred)?.id ??
    businesses.find((business) => business.id === businessIdCache.get(tenantId))?.id ??
    businesses.find((business) => business.id === storedBusinessId(tenantId))?.id ??
    businesses[0]?.id;

  if (!chosen) {
    throw new Error("No se encontró un negocio configurado para este tenant.");
  }
  businessIdCache.set(tenantId, chosen);
  storeBusinessId(chosen, tenantId);
  return chosen;
}

export async function createOrder(payload: {
  business_id: string;
  request_id: string;
  order_type: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ECOMMERCE" | "CALL_CENTER";
  source_channel: "POS" | "WEB" | "KIOSK" | "PHONE" | "API";
  notes?: string;
  items: { sku: string; name: string; quantity: number; unit_price: number; notes?: string }[];
}): Promise<Order> {
  const { data, error } = await api.POST("/v1/orders", {
    params: { header: { "X-Tenant-Id": resolveTenantId() } },
    body: payload,
  });
  if (error || !data) {
    throw new Error("No fue posible enviar la comanda a cocina.");
  }
  return data;
}

export async function listOpenOrders(): Promise<
  paths["/v1/orders"]["get"]["responses"]["200"]["content"]["application/json"]
> {
  const { data, error } = await api.GET("/v1/orders", {
    params: { header: { "X-Tenant-Id": resolveTenantId() }, query: { status: "PENDING", size: 50 } },
  });
  if (error || !data) {
    throw new Error("No fue posible cargar las órdenes abiertas.");
  }
  return data;
}

export async function dispatchOrderToKitchen(orderId: string, businessId: string): Promise<void> {
  const { error } = await api.POST("/v1/kitchen/tickets", {
    params: { header: { "X-Tenant-Id": resolveTenantId() } },
    body: { order_id: orderId, business_id: businessId },
  });
  if (error) {
    throw new Error("Orden creada, pero no fue posible despacharla a las estaciones de cocina.");
  }
}
