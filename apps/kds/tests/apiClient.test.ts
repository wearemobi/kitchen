import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@kitchen/common";

function unauthorizedResponse() {
  return new Response(
    JSON.stringify({
      type: "https://wearemobi.com/errors/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Invalid or expired session token",
      instance: "/v1/kitchen/board",
    }),
    { status: 401, headers: { "Content-Type": "application/problem+json" } },
  );
}

function makeClient(token: string | null, onUnauthorized: () => void) {
  return createApiClient({
    resolveTenantId: () => "tenant_demo_sv",
    getToken: () => token,
    onUnauthorized,
    baseUrl: "https://api.test",
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApiClient — 401 session expiry (kitchen#1)", () => {
  it("invoca onUnauthorized cuando el board responde 401 con token activo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(unauthorizedResponse());
    vi.stubGlobal("fetch", fetchMock);
    const onUnauthorized = vi.fn();

    const client = makeClient("sst.expired", onUnauthorized);
    const { error, response } = await client.GET("/v1/kitchen/board", {
      params: { header: { "X-Tenant-Id": "tenant_demo_sv" } },
    });

    expect(response.status).toBe(401);
    expect(error).toBeTruthy();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.headers.get("Authorization")).toBe("Bearer sst.expired");
  });

  it("no invoca onUnauthorized en un 401 de /v1/auth/login-pin", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorizedResponse()));
    const onUnauthorized = vi.fn();

    const client = makeClient("sst.expired", onUnauthorized);
    const { error, response } = await client.POST("/v1/auth/login-pin", {
      params: { header: { "X-Tenant-Id": "tenant_demo_sv" } },
      body: { username: "cocinero01", pin: "000000" },
    });

    expect(response.status).toBe(401);
    expect(error).toBeTruthy();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("no invoca onUnauthorized cuando no hay token (pantalla de PIN)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorizedResponse()));
    const onUnauthorized = vi.fn();

    const client = makeClient(null, onUnauthorized);
    await client.GET("/v1/auth/cashiers", {
      params: { header: { "X-Tenant-Id": "tenant_demo_sv" } },
    });

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("deduplica peticiones concurrentes con el mismo token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => unauthorizedResponse()));
    const onUnauthorized = vi.fn();

    const client = makeClient("sst.expired", onUnauthorized);
    await Promise.all([
      client.GET("/v1/kitchen/board", { params: { header: { "X-Tenant-Id": "t" } } }),
      client.GET("/v1/kitchen/board", { params: { header: { "X-Tenant-Id": "t" } } }),
      client.GET("/v1/kitchen/board", { params: { header: { "X-Tenant-Id": "t" } } }),
    ]);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
