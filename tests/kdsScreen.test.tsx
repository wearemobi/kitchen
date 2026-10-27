import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { BoardResponse } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  fetchBoard: vi.fn(),
  fireTransition: vi.fn(),
  resolveTenantId: vi.fn(() => "tenant_demo_sv"),
}));

vi.mock("../src/lib/sounds", () => ({
  playNewTicketChime: vi.fn(),
  playTransitionSound: vi.fn(),
  playKeypadClick: vi.fn(),
}));

import { fetchBoard, fireTransition } from "../src/lib/api";
import { playNewTicketChime, playTransitionSound } from "../src/lib/sounds";
import KdsScreen from "../src/components/kds/KdsScreen";
import { useAuthStore } from "../src/store/auth";

const boardWith = (ticketIds: string[]): BoardResponse =>
  ({
    stations: [
      {
        id: "st-1",
        name: "Parrilla",
        icon: "🔥",
        view_type: "queue",
        tickets: ticketIds.map((id) => ({
          id,
          order_number: `#${id}`,
          channel: "DINE_IN",
          status: "PENDING",
          created_at: new Date().toISOString(),
          items: [{ product_id: "p1", product_name: "Pupusa", quantity: 2 }],
          available_transitions: [
            {
              id: "tr-1",
              action_key: "START_PREP",
              action_label: "Comenzar",
              target_status: "IN_PROGRESS",
              requires_confirmation: false,
            },
          ],
        })),
      },
      { id: "st-2", name: "Bebidas", icon: "🥤", view_type: "queue", tickets: [] },
    ],
    stats: { pending_tickets: ticketIds.length, in_progress_tickets: 0, avg_prep_time_minutes: 12.5 },
  }) as unknown as BoardResponse;

beforeEach(() => {
  cleanup();
  vi.mocked(fetchBoard).mockReset();
  vi.mocked(fireTransition).mockReset();
  vi.mocked(playNewTicketChime).mockReset();
  vi.mocked(playTransitionSound).mockReset();
  useAuthStore.getState().login({
    token: "sst.test",
    tenantId: "tenant_demo_sv",
    operatorId: "op-1",
    operatorName: "Cocinero Uno",
    roles: ["KITCHEN"],
    expiresAtUnix: 0,
  });
});

describe("KdsScreen", () => {
  it("renderiza estaciones, tickets y stats, y dispara transiciones", async () => {
    vi.mocked(fetchBoard).mockResolvedValue(boardWith(["104"]));
    render(<KdsScreen />);

    expect(await screen.findByText("#104")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Parrilla/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bebidas/ })).toBeInTheDocument();
    expect(screen.getByText("Cocinero Uno")).toBeInTheDocument();
    expect(screen.getByText("12.5m")).toBeInTheDocument();
    expect(screen.getByTestId("consolidated-bar")).toHaveTextContent("2×");

    fireEvent.click(screen.getByRole("button", { name: "Comenzar" }));
    await waitFor(() =>
      expect(fireTransition).toHaveBeenCalledWith("104", "START_PREP", "op-1", "Cocinero Uno"),
    );
    await waitFor(() => expect(playTransitionSound).toHaveBeenCalled());
    // tras la transicion se refresca el board (2 llamadas iniciales/refresh)
    await waitFor(() => expect(vi.mocked(fetchBoard).mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("suena el chime solo cuando llegan comandas nuevas", async () => {
    let board = boardWith(["104"]);
    vi.mocked(fetchBoard).mockImplementation(async () => board);
    render(<KdsScreen pollIntervalMs={40} />);
    expect(await screen.findByText("#104")).toBeInTheDocument();
    expect(playNewTicketChime).not.toHaveBeenCalled();

    board = boardWith(["104", "105"]);
    await waitFor(() => expect(screen.getByText("#105")).toBeInTheDocument(), { timeout: 3000 });
    expect(playNewTicketChime).toHaveBeenCalledTimes(1);
  });

  it("cambia de estacion con las tabs", async () => {
    vi.mocked(fetchBoard).mockResolvedValue({
      stations: [
        { id: "st-1", name: "Parrilla", tickets: [{ id: "a", order_number: "#1", items: [], available_transitions: [] }] },
        { id: "st-2", name: "Bebidas", tickets: [{ id: "b", order_number: "#9", items: [], available_transitions: [] }] },
      ],
      stats: {},
    } as unknown as BoardResponse);
    render(<KdsScreen />);
    expect(await screen.findByText("#1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Bebidas/ }));
    expect(screen.getByText("#9")).toBeInTheDocument();
    expect(screen.queryByText("#1")).not.toBeInTheDocument();
  });

  it("muestra aviso de error si wared no responde", async () => {
    vi.mocked(fetchBoard).mockRejectedValue(new Error("No fue posible cargar el tablero de cocina."));
    render(<KdsScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent("reintentando automáticamente");
  });
});
