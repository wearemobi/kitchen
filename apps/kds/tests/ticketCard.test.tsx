import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Ticket, TicketTransition } from "../src/lib/api";
import TicketCard from "../src/components/kds/TicketCard";

const start: TicketTransition = {
  id: "tr-1",
  action_key: "START_PREP",
  action_label: "Comenzar",
  target_status: "IN_PROGRESS",
  requires_confirmation: false,
};

const ready: TicketTransition = {
  id: "tr-2",
  action_key: "SET_READY",
  action_label: "Listo",
  target_status: "READY",
  requires_confirmation: true,
};

const ticket = {
  id: "t-1",
  order_number: "#104",
  channel: "DINE_IN",
  table_number: "Mesa 4",
  customer_name: "Juan Pérez",
  notes: "Cliente con prisa",
  status: "IN_PROGRESS",
  created_at: "2026-10-26T12:00:00Z",
  items: [
    { product_id: "p1", product_name: "Hamburguesa Doble", quantity: 2, notes: "Sin cebolla" },
    { product_id: "p2", product_name: "Papas Locas", quantity: 1 },
  ],
  available_transitions: [start, ready],
} as unknown as Ticket;

describe("TicketCard", () => {
  it("muestra contexto de orden, items con notas y transiciones", () => {
    render(<TicketCard ticket={ticket} onTransition={vi.fn()} />);
    expect(screen.getByText("#104")).toBeInTheDocument();
    expect(screen.getByText(/Mesa 4/)).toBeInTheDocument();
    expect(screen.getByText("Hamburguesa Doble")).toBeInTheDocument();
    expect(screen.getByText("Sin cebolla")).toBeInTheDocument();
    expect(screen.getByText(/Cliente con prisa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comenzar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Listo" })).toBeInTheDocument();
  });

  it("ejecuta de inmediato una transicion sin confirmacion", () => {
    const onTransition = vi.fn();
    render(<TicketCard ticket={ticket} onTransition={onTransition} />);
    fireEvent.click(screen.getByRole("button", { name: "Comenzar" }));
    expect(onTransition).toHaveBeenCalledWith(ticket, start);
  });

  it("pide confirmacion cuando la transicion la exige", () => {
    const onTransition = vi.fn();
    render(<TicketCard ticket={ticket} onTransition={onTransition} />);
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(onTransition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onTransition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onTransition).toHaveBeenCalledWith(ticket, ready);
  });

  it("muestra estado terminal sin acciones", () => {
    const done = { ...ticket, status: "COMPLETED", available_transitions: [] } as unknown as Ticket;
    render(<TicketCard ticket={done} onTransition={vi.fn()} />);
    expect(screen.getByText("Sin acciones disponibles")).toBeInTheDocument();
    expect(screen.getByText("Completada")).toBeInTheDocument();
  });
});
