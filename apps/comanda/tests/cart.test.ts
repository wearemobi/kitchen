import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "../src/store/cart.store";

beforeEach(() => useCartStore.getState().clear());

describe("cart store", () => {
  it("adds item and increments quantity", () => {
    useCartStore.getState().addItem({ sku: "P1", name: "Pupusa", unitPrice: 100000 });
    useCartStore.getState().addItem({ sku: "P1", name: "Pupusa", unitPrice: 100000 });
    const item = useCartStore.getState().items[0];
    expect(item?.quantity).toBe(20000);
  });

  it("clears cart", () => {
    useCartStore.getState().addItem({ sku: "P1", name: "Pupusa", unitPrice: 100000 });
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
