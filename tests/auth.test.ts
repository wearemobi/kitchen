import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "../src/store/auth";

beforeEach(() => {
  useAuthStore.getState().logout();
});

describe("auth store", () => {
  it("guarda la sesion del operador tras login", () => {
    useAuthStore.getState().login({
      token: "sst.abc",
      tenantId: "tenant_demo_sv",
      operatorId: "op-1",
      operatorName: "Carlos Cocinero",
      roles: ["KITCHEN"],
      expiresAtUnix: 1800000000,
    });
    const state = useAuthStore.getState();
    expect(state.token).toBe("sst.abc");
    expect(state.operatorName).toBe("Carlos Cocinero");
    expect(state.roles).toContain("KITCHEN");
  });

  it("limpia todo tras logout", () => {
    useAuthStore.getState().login({
      token: "sst.abc",
      tenantId: "t",
      operatorId: "op-1",
      operatorName: "x",
      roles: [],
      expiresAtUnix: 0,
    });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBe("");
    expect(useAuthStore.getState().operatorId).toBe("");
  });
});
