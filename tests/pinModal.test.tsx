import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Cashier } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  loginWithPin: vi.fn(),
  resolveTenantId: vi.fn(() => "tenant_demo_sv"),
}));

import { loginWithPin } from "../src/lib/api";
import PinModal from "../src/components/auth/PinModal";
import { useAuthStore } from "../src/store/auth";

const cashier = {
  id: "op-1",
  username: "cocinero01",
  display_name: "Cocinero Uno",
  roles: ["KITCHEN"],
} as Cashier;

const okSession = {
  token: "sst.ok",
  tenant_id: "tenant_demo_sv",
  operator_id: "op-1",
  display_name: "Cocinero Uno",
  roles: ["KITCHEN"],
  expires_at_unix: 1_800_000_000,
};

beforeEach(() => {
  cleanup();
  vi.mocked(loginWithPin).mockReset();
  useAuthStore.getState().logout();
});

function typePin(pin = "123456") {
  for (const digit of pin) {
    fireEvent.click(screen.getByRole("button", { name: digit }));
  }
}

describe("PinModal", () => {
  it("captura 6 digitos y delega el login por PIN", async () => {
    vi.mocked(loginWithPin).mockResolvedValue(okSession);
    const onClose = vi.fn();
    render(<PinModal cashier={cashier} onClose={onClose} />);

    typePin();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(loginWithPin).toHaveBeenCalledWith("cocinero01", "123456"));
    await waitFor(() => expect(useAuthStore.getState().token).toBe("sst.ok"));
    expect(onClose).toHaveBeenCalled();
  });

  it("ignora digitos adicionales a los 6", () => {
    vi.mocked(loginWithPin).mockResolvedValue(okSession);
    render(<PinModal cashier={cashier} onClose={vi.fn()} />);
    typePin("123456789");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  it("limpia el PIN y muestra error con credenciales invalidas", async () => {
    vi.mocked(loginWithPin).mockRejectedValue(new Error("PIN incorrecto para este operador."));
    render(<PinModal cashier={cashier} onClose={vi.fn()} />);

    typePin("000000");
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("PIN incorrecto");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
    expect(useAuthStore.getState().token).toBe("");
  });

  it("backspace quita el ultimo digito", () => {
    vi.mocked(loginWithPin).mockResolvedValue(okSession);
    render(<PinModal cashier={cashier} onClose={vi.fn()} />);
    typePin("12345");
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });
});
