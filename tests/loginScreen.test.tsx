import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("../src/lib/api", () => ({
  fetchCashiers: vi.fn(),
  loginWithPin: vi.fn(),
  resolveTenantId: vi.fn(() => "tenant_demo_sv"),
}));

import { fetchCashiers } from "../src/lib/api";
import LoginScreen from "../src/components/auth/LoginScreen";

const roster = [
  { id: "op-1", username: "cocinero01", display_name: "Carlos Quijano", roles: ["KITCHEN"] },
  { id: "op-2", username: "cocinero02", display_name: "Ana Martínez", roles: ["KITCHEN", "CASHIER"] },
];

beforeEach(() => {
  cleanup();
  vi.mocked(fetchCashiers).mockReset();
});

describe("LoginScreen", () => {
  it("muestra el roster de operadores y abre el keypad al tocar uno", async () => {
    vi.mocked(fetchCashiers).mockResolvedValue(roster as never);
    render(<LoginScreen />);

    expect(await screen.findByText("Carlos Quijano")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-badge")).toHaveTextContent("tenant_demo_sv");
    expect(screen.getByText("CQ")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ana Martínez/ }));
    expect(screen.getByRole("dialog", { name: /Ana Martínez/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7" })).toBeInTheDocument();
  });

  it("muestra error si el roster no carga", async () => {
    vi.mocked(fetchCashiers).mockRejectedValue(new Error("No fue posible cargar los operadores de este tenant."));
    render(<LoginScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent("operadores");
  });

  it("avisa cuando no hay operadores activos", async () => {
    vi.mocked(fetchCashiers).mockResolvedValue([]);
    render(<LoginScreen />);
    expect(await screen.findByText(/No hay operadores activos/)).toBeInTheDocument();
  });
});
