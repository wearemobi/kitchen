import { beforeEach, describe, expect, it } from "vitest";
import { createAuthStore } from "@kitchen/common";

function seedSession(storageKey: string, expiresAtUnix: number) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      state: {
        token: "sst.persisted",
        tenantId: "tenant_demo_sv",
        operatorId: "op-1",
        operatorName: "Cocinero Uno",
        roles: ["KITCHEN"],
        expiresAtUnix,
      },
      version: 0,
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("createAuthStore — hidratación con expiración (kitchen#1)", () => {
  it("descarta una sesión persistida ya expirada", () => {
    const key = "ware-kds.auth.expired";
    seedSession(key, Math.floor(Date.now() / 1000) - 60);

    const store = createAuthStore(key);

    expect(store.getState().token).toBe("");
    expect(store.getState().operatorId).toBe("");
    expect(store.getState().operatorName).toBe("");
  });

  it("conserva una sesión persistida vigente", () => {
    const key = "ware-kds.auth.valid";
    seedSession(key, Math.floor(Date.now() / 1000) + 3600);

    const store = createAuthStore(key);

    expect(store.getState().token).toBe("sst.persisted");
    expect(store.getState().operatorName).toBe("Cocinero Uno");
  });

  it("conserva sesiones heredadas sin expiresAtUnix", () => {
    const key = "ware-kds.auth.legacy";
    seedSession(key, 0);

    const store = createAuthStore(key);

    expect(store.getState().token).toBe("sst.persisted");
  });
});
