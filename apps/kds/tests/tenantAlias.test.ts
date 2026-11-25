import { afterEach, describe, expect, it } from "vitest";
import { resolveTenantId } from "@kitchen/common";

describe("resolveTenantId — alias ?tenant_id (kitchen#14)", () => {
  afterEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("acepta ?tenant_id y lo persiste", () => {
    window.history.pushState({}, "", "/?tenant_id=creatiaes");
    expect(resolveTenantId("test.tenant")).toBe("creatiaes");
    expect(localStorage.getItem("test.tenant")).toBe("creatiaes");
  });

  it("mantiene precedencia ?t > ?tenant > ?tenant_id", () => {
    window.history.pushState({}, "", "/?tenant_id=third&tenant=second&t=first");
    expect(resolveTenantId("test.tenant2")).toBe("first");
  });

  it("usa storage cuando no hay query", () => {
    localStorage.setItem("test.tenant3", "stored");
    expect(resolveTenantId("test.tenant3")).toBe("stored");
  });

  it("devuelve default sin query ni storage", () => {
    expect(resolveTenantId("test.tenant4")).toBe("tenant_demo_sv");
  });
});