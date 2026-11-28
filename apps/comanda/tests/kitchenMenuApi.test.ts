import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchKitchenMenuItems,
  fetchKitchenMenus,
  fetchVaultDownloadUrl,
  resolveTenantId,
} from "../src/lib/api";
import { useAuthStore } from "../src/store/auth";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function firstRequest(fetchMock: ReturnType<typeof vi.fn>): Request {
  return fetchMock.mock.calls[0][0] as Request;
}

describe("Comanda consume el menú de cocina (SPEC-W173)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuthStore.getState().logout();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("llama a /v1/kitchen/menu-items con active_now y filtros de menú/categoría", async () => {
    const item = {
      id: "item-1",
      sku: "SKU-1",
      name: "Pupusa de frijol",
      effective_price: 55000,
      status: "ACTIVE",
    };
    fetchMock.mockResolvedValue(jsonResponse({ items: [item] }));

    const items = await fetchKitchenMenuItems("business-1", {
      menuId: "menu-1",
      categoryId: "cat-1",
    });

    expect(items).toEqual([item]);
    const request = firstRequest(fetchMock);
    const url = new URL(request.url);
    expect(url.pathname).toBe("/v1/kitchen/menu-items");
    expect(url.searchParams.get("business_id")).toBe("business-1");
    expect(url.searchParams.get("active_now")).toBe("true");
    expect(url.searchParams.get("menu_id")).toBe("menu-1");
    expect(url.searchParams.get("category_id")).toBe("cat-1");
    expect(request.headers.get("X-Tenant-Id")).toBe(resolveTenantId());
  });

  it("carga los menús del negocio", async () => {
    const menu = { id: "menu-1", name: "Almuerzo", status: "ACTIVE" };
    fetchMock.mockResolvedValue(jsonResponse([menu]));

    const menus = await fetchKitchenMenus("business-1");

    expect(menus).toEqual([menu]);
    const request = firstRequest(fetchMock);
    const url = new URL(request.url);
    expect(url.pathname).toBe("/v1/kitchen/menus");
    expect(url.searchParams.get("business_id")).toBe("business-1");
  });

  it("resuelve la foto Vault una sola vez por archivo", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ download_url: "/edge/vault/download?ticket=t1" }));

    const first = await fetchVaultDownloadUrl("vault-1");
    const second = await fetchVaultDownloadUrl("vault-1");

    expect(first).toBe("/edge/vault/download?ticket=t1");
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(firstRequest(fetchMock).url).pathname).toBe("/v1/vault/files/vault-1");
  });
});
