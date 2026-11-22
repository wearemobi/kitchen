import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import OpenOrdersDialog, { type OpenOrder } from "./OpenOrdersDialog";
import Cart from "./Cart";
import { useCartStore } from "../../store/cart.store";
import { listOpenOrders } from "../../lib/api";

vi.mock("../../lib/api", () => ({
  listOpenOrders: vi.fn(),
}));

const paidOrder = {
  id: "order-paid",
  display_id: "#ORD-100",
  status: "COMPLETED",
  notes: "Mesa 4",
  payment_status: "PAID",
  retail_folio: "F-1052",
  document_type: "01",
} as OpenOrder;

const unpaidOrder = {
  id: "order-unpaid",
  display_id: "#ORD-101",
  status: "PENDING",
  notes: "Mesa 5",
  payment_status: "UNPAID",
} as OpenOrder;

describe("OpenOrdersDialog — visibilidad de estado de pago (SPEC-KSAT4)", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    vi.mocked(listOpenOrders).mockResolvedValue({
      items: [paidOrder, unpaidOrder],
    } as never);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useCartStore.getState().clear();
  });

  it("muestra PAID en verde con metadatos fiscales y UNPAID en ámbar", async () => {
    render(<OpenOrdersDialog onClose={() => {}} />);

    expect(await screen.findByText("PAID")).toBeTruthy();
    expect(screen.getByText("UNPAID")).toBeTruthy();
    expect(screen.getByText("Liquidada en Caja")).toBeTruthy();
    expect(screen.getByText("Folio: F-1052")).toBeTruthy();
    expect(screen.getByText("Documento: 01")).toBeTruthy();

    const paidBadge = screen.getByText("PAID");
    const unpaidBadge = screen.getByText("UNPAID");
    expect(paidBadge.className).toContain("bg-emerald-500/15");
    expect(unpaidBadge.className).toContain("bg-amber-500/15");
  });

  it("bloquea el reenvío a cobro de una orden liquidada", async () => {
    const onLoadOrder = vi.fn();
    render(
      <OpenOrdersDialog onClose={() => {}} onLoadOrder={onLoadOrder} />
    );

    const cobrarButtons = await screen.findAllByRole("button", {
      name: "Cobrar",
    });
    expect(cobrarButtons).toHaveLength(2);

    fireEvent.click(cobrarButtons[0]);
    expect(onLoadOrder).not.toHaveBeenCalled();

    fireEvent.click(cobrarButtons[1]);
    await waitFor(() =>
      expect(onLoadOrder).toHaveBeenCalledWith(
        expect.objectContaining({ id: "order-unpaid" })
      )
    );
  });

  it("deshabilita el checkout y la edición cuando el carrito tiene una orden liquidada", () => {
    const onSend = vi.fn();
    useCartStore
      .getState()
      .addItem({ sku: "COCA", name: "Coca Cola", unitPrice: 10000 });

    render(
      <Cart
        onClose={() => {}}
        onSend={onSend}
        sending={false}
        sendError=""
        loadedOrder={paidOrder}
      />
    );

    expect(screen.getByRole("status").textContent).toContain(
      "Orden Liquidada en Caja"
    );
    expect(screen.getByText("Folio: F-1052")).toBeTruthy();
    expect(screen.getByText("Documento: 01")).toBeTruthy();

    const checkout = screen.getByRole("button", { name: "Enviar a Cocina" });
    expect(checkout).toBeDisabled();
    expect(screen.getByPlaceholderText("Mesa")).toBeDisabled();

    fireEvent.click(checkout);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("permite cobrar una orden no liquidada cargada en el carrito", () => {
    const onSend = vi.fn();
    useCartStore
      .getState()
      .addItem({ sku: "COCA", name: "Coca Cola", unitPrice: 10000 });

    render(
      <Cart
        onClose={() => {}}
        onSend={onSend}
        sending={false}
        sendError=""
        loadedOrder={unpaidOrder}
      />
    );

    expect(screen.queryByRole("status")).toBeNull();
    const checkout = screen.getByRole("button", { name: "Enviar a Cocina" });
    expect(checkout).not.toBeDisabled();
    expect(screen.getByPlaceholderText("Mesa")).not.toBeDisabled();

    fireEvent.click(checkout);
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
