import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchKitchenMenuItems, loginWithPin } from "../src/lib/api";
import { useAuthStore } from "../src/store/auth";

function unauthorizedResponse() {
  return new Response(
    JSON.stringify({
      type: "https://wearemobi.com/errors/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Invalid or expired session token",
    }),
    { status: 401, headers: { "Content-Type": "application/problem+json" } },
  );
}

function loginExpiredSession() {
  useAuthStore.getState().login({
    token: "sst.expired",
    tenantId: "tenant_demo_sv",
    operatorId: "op-1",
    operatorName: "Mesero Uno",
    roles: ["COMANDERO"],
    expiresAtUnix: 0,
  });
}

beforeEach(() => {
  useAuthStore.getState().logout();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Comanda session expiry wiring (kitchen#1)", () => {
  it("limpia la sesión cuando el catálogo responde 401", async () => {
    loginExpiredSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorizedResponse()));

    await expect(fetchKitchenMenuItems("business-1")).rejects.toThrow(
      "No fue posible cargar el menú de cocina.",
    );
    expect(useAuthStore.getState().token).toBe("");
    expect(useAuthStore.getState().operatorId).toBe("");
  });

  it("mantiene la sesión y el mensaje de PIN incorrecto en un 401 de login-pin", async () => {
    loginExpiredSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unauthorizedResponse()));

    await expect(loginWithPin("mesero01", "000000")).rejects.toThrow(
      "PIN incorrecto para este operador.",
    );
    expect(useAuthStore.getState().token).toBe("sst.expired");
  });
});
