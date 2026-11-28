import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PosScreen from "./PosScreen";
import {
  fetchBusinesses,
  fetchKitchenMenuItems,
  fetchKitchenMenus,
} from "../../lib/api";
import { useCartStore } from "../../store/cart.store";

vi.mock("../../lib/api", () => ({
  fetchBusinesses: vi.fn(),
  fetchKitchenMenuItems: vi.fn(),
  fetchKitchenMenus: vi.fn(),
  resolveBusinessId: vi.fn().mockResolvedValue("business-1"),
  storeBusinessId: vi.fn(),
  storedBusinessId: vi.fn().mockReturnValue(""),
  urlBusinessId: vi.fn().mockReturnValue(""),
  createOrder: vi.fn(),
  dispatchOrderToKitchen: vi.fn(),
  fetchVaultDownloadUrl: vi.fn(),
}));

vi.mock("../../lib/sounds", () => ({
  playSuccess: vi.fn(),
}));

vi.mock("./Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("./ProductGrid", () => ({
  default: ({ products }: { products: { id?: string; name?: string }[] }) => (
    <div data-testid="product-grid">
      {products.map((product) => (
        <span key={product.id}>{product.name}</span>
      ))}
    </div>
  ),
}));

vi.mock("./Cart", () => ({
  default: () => null,
}));

vi.mock("./OpenOrdersDialog", () => ({
  default: () => null,
}));

describe("PosScreen — catálogo activo de cocina (SPEC-W173)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCartStore.getState().clear();
    vi.mocked(fetchBusinesses).mockResolvedValue([{ id: "business-1", name: "Casa Matriz" }]);
    vi.mocked(fetchKitchenMenus).mockResolvedValue([
      { id: "menu-1", name: "Almuerzo", status: "ACTIVE" },
    ]);
    vi.mocked(fetchKitchenMenuItems).mockResolvedValue([
      {
        id: "item-1",
        sku: "SKU-1",
        name: "Pupusa de frijol",
        category_id: "cat-1",
        category_name: "Principales",
        status: "ACTIVE",
      },
      {
        id: "item-2",
        sku: "SKU-2",
        name: "Gaseosa",
        category_id: "cat-2",
        category_name: "Bebidas",
        status: "ACTIVE",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    useCartStore.getState().clear();
  });

  it("filtra por categoría y pide el menú activo al seleccionar un menú", async () => {
    render(<PosScreen />);

    expect(await screen.findByText("Pupusa de frijol")).toBeTruthy();
    expect(screen.getByText("Gaseosa")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Bebidas" }));
    await waitFor(() => expect(screen.queryByText("Pupusa de frijol")).toBeNull());
    expect(screen.getByText("Gaseosa")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Menú"), { target: { value: "menu-1" } });
    await waitFor(() =>
      expect(fetchKitchenMenuItems).toHaveBeenCalledWith(
        "business-1",
        expect.objectContaining({ activeNow: true, menuId: "menu-1" }),
      ),
    );
  });
});
