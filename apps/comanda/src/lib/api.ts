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

export interface KitchenMenu {
  id?: string;
  business_id?: string;
  name?: string;
  description?: string;
  emoji?: string;
  start_time?: string | null;
  end_time?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  sort_order?: number;
}

export interface KitchenMenuItem {
  id?: string;
  business_id?: string;
  sku?: string;
  name?: string;
  description?: string;
  category_id?: string | null;
  category_name?: string | null;
  emoji?: string;
  image_file_id?: string | null;
  prep_time_minutes?: number;
  effective_price?: number;
  effective_price_usd?: number;
  status?: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
  sort_order?: number;
  station_name?: string | null;
  menu_ids?: string[];
}

export type Order = paths["/v1/orders"]["post"]["responses"]["201"]["content"]["application/json"];

type LooseGetClient = {
  GET: (
    url: string,
    options: {
      params: {
        header: { "X-Tenant-Id": string };
        query: Record<string, string | number | boolean | undefined>;
      };
    },
  ) => Promise<{ data?: unknown; error?: unknown }>;
};

const looseGetApi = api as unknown as LooseGetClient;
const vaultImageCache = new Map<string, string>();

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return [];
}

export async function fetchCashiers(): Promise<Cashier[]> {
  return commonFetchCashiers(api, resolveTenantId());
}

export async function loginWithPin(username: string, pin: string): Promise<PinLoginResponse> {
  return commonLoginWithPin(api, resolveTenantId(), username, pin);
}

export interface FetchKitchenMenuItemsOptions {
  activeNow?: boolean;
  menuId?: string;
  categoryId?: string;
  search?: string;
}

export async function fetchKitchenMenuItems(
  businessId: string,
  options: FetchKitchenMenuItemsOptions = {},
): Promise<KitchenMenuItem[]> {
  const query: Record<string, string | number | boolean | undefined> = {
    business_id: businessId,
    active_now: options.activeNow ?? true,
  };
  if (options.menuId) query.menu_id = options.menuId;
  if (options.categoryId) query.category_id = options.categoryId;
  if (options.search) query.search = options.search;

  const { data, error } = await looseGetApi.GET("/v1/kitchen/menu-items", {
    params: { header: { "X-Tenant-Id": resolveTenantId() }, query },
  });
  if (error || !data) {
    throw new Error("No fue posible cargar el menú de cocina.");
  }
  return normalizeList<KitchenMenuItem>(data);
}

export async function fetchKitchenMenus(businessId: string): Promise<KitchenMenu[]> {
  const { data, error } = await looseGetApi.GET("/v1/kitchen/menus", {
    params: {
      header: { "X-Tenant-Id": resolveTenantId() },
      query: { business_id: businessId },
    },
  });
  if (error || !data) {
    throw new Error("No fue posible cargar los menús de cocina.");
  }
  return normalizeList<KitchenMenu>(data);
}

export async function fetchVaultDownloadUrl(fileId: string): Promise<string> {
  const cached = vaultImageCache.get(fileId);
  if (cached) return cached;

  const { data, error } = await looseGetApi.GET(`/v1/vault/files/${encodeURIComponent(fileId)}`, {
    params: { header: { "X-Tenant-Id": resolveTenantId() }, query: {} },
  });
  const downloadUrl =
    data && typeof data === "object" ? (data as { download_url?: unknown }).download_url : undefined;
  if (error || typeof downloadUrl !== "string" || !downloadUrl) {
    throw new Error("No fue posible cargar la foto del platillo.");
  }
  vaultImageCache.set(fileId, downloadUrl);
  return downloadUrl;
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
