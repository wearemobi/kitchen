import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Cart from "../src/components/pos/Cart";
import { useCartStore } from "../src/store/cart.store";
import { resolveBusinessId } from "../src/lib/api";

beforeEach(() => {
  useCartStore.getState().clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Cart total & business_id resolution", () => {
  it("computes total using 10^-4 scaling without multiplying twice", () => {
    // 2 units (quantity=20000) of $1.00 (unitPrice=10000) => $2.00
    useCartStore.getState().addItem({ sku: "COCA", name: "Coca Cola", unitPrice: 10000 });
    useCartStore.getState().addItem({ sku: "COCA", name: "Coca Cola", unitPrice: 10000 });

    render(<Cart onClose={() => {}} onSend={() => {}} sending={false} sendError="" />);
    expect(screen.getByText("$2.00")).toBeTruthy();
  });

  it("resolves business_id from /v1/orders/businesses when VITE_BUSINESS_ID is unset", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify([{ id: "ebe05526-d0bb-4291-b303-9cfed9680964", name: "Mobiware" }]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const id = await resolveBusinessId();
    expect(id).toBe("ebe05526-d0bb-4291-b303-9cfed9680964");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
