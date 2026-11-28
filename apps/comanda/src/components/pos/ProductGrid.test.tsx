import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductGrid from "./ProductGrid";
import { fetchVaultDownloadUrl, type KitchenMenuItem } from "../../lib/api";
import { useCartStore } from "../../store/cart.store";

vi.mock("../../lib/api", () => ({
  fetchVaultDownloadUrl: vi.fn(),
}));

vi.mock("../../lib/sounds", () => ({
  playAdd: vi.fn(),
}));

const availableItem: KitchenMenuItem = {
  id: "item-1",
  sku: "SKU-1",
  name: "Pupusa de frijol",
  category_name: "Principales",
  image_file_id: "vault-1",
  effective_price: 55000,
  prep_time_minutes: 8,
  status: "ACTIVE",
};

const outOfStockItem: KitchenMenuItem = {
  id: "item-2",
  sku: "SKU-2",
  name: "Pollo frito",
  emoji: "🍗",
  effective_price: 72000,
  prep_time_minutes: 15,
  status: "OUT_OF_STOCK",
};

describe("ProductGrid — menú activo de cocina (SPEC-W173)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.getState().clear();
    vi.mocked(fetchVaultDownloadUrl).mockResolvedValue("/edge/vault/download?ticket=t1");
  });

  afterEach(() => {
    cleanup();
    useCartStore.getState().clear();
  });

  it("muestra foto Vault, precio efectivo y tiempo de prep, y agrega al carrito", async () => {
    render(<ProductGrid products={[availableItem]} />);

    expect(screen.getByText("Pupusa de frijol")).toBeTruthy();
    expect(screen.getByText("Principales")).toBeTruthy();
    expect(screen.getByText("$5.50")).toBeTruthy();
    expect(screen.getByText("8 min")).toBeTruthy();

    const image = await screen.findByRole("img");
    expect(image.getAttribute("src")).toContain("/edge/vault/download?ticket=t1");

    fireEvent.click(screen.getByRole("button", { name: /Pupusa de frijol/ }));
    expect(useCartStore.getState().items[0]).toMatchObject({
      sku: "SKU-1",
      name: "Pupusa de frijol",
      unitPrice: 55000,
    });
    await waitFor(() => expect(fetchVaultDownloadUrl).toHaveBeenCalledWith("vault-1"));
  });

  it("muestra Agotado, usa emoji fallback y bloquea la adición en OUT_OF_STOCK", () => {
    render(<ProductGrid products={[outOfStockItem]} />);

    const button = screen.getByRole("button", { name: /Pollo frito/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Agotado")).toBeTruthy();
    expect(screen.getByText("🍗")).toBeTruthy();
    expect(screen.getByText("$7.20")).toBeTruthy();

    fireEvent.click(button);
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(fetchVaultDownloadUrl).not.toHaveBeenCalled();
  });

  it("muestra estado vacío cuando el menú activo no tiene platillos", () => {
    render(<ProductGrid products={[]} />);

    expect(screen.getByText("Sin platillos disponibles en este menú.")).toBeTruthy();
  });
});
