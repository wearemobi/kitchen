import createClient from "openapi-fetch";
import type { paths } from "./schema";
import { useAuthStore } from "../store/auth";

export const TENANT_STORAGE_KEY = "ware-comanda.tenant";
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

export type Product = NonNullable<
  paths["/v1/inventory/products"]["get"]["responses"]["200"]["content"]["application/json"]["items"]
>[number];

export type Order = paths["/v1/orders"]["post"]["responses"]["201"]["content"]["application/json"];

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

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await api.GET("/v1/inventory/products", {
    params: { header: { "X-Tenant-Id": resolveTenantId() }, query: { size: 200, sort: "name,asc" } },
  });
  if (error || !data) {
    throw new Error("No fue posible cargar el catálogo de productos.");
  }
  return data.items ?? [];
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
