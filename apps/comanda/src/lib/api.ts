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
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://api.mobiware.app";

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

export async function resolveBusinessId(): Promise<string> {
  const envBusinessId = (import.meta.env.VITE_BUSINESS_ID as string | undefined)?.trim();
  if (envBusinessId) {
    return envBusinessId;
  }

  const tenantId = resolveTenantId();
  const cached = businessIdCache.get(tenantId);
  if (cached) {
    return cached;
  }

  const { data, error } = await (
    api as unknown as {
      GET: (
        url: string,
        opts: { params: { header: { "X-Tenant-Id": string } } },
      ) => Promise<{ data?: Array<{ id?: string }>; error?: unknown }>;
    }
  ).GET("/v1/orders/businesses", {
    params: { header: { "X-Tenant-Id": tenantId } },
  });
  if (error || !Array.isArray(data) || data.length === 0 || !data[0]?.id) {
    throw new Error("No se encontró un negocio configurado para este tenant.");
  }

  businessIdCache.set(tenantId, data[0].id);
  return data[0].id;
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
