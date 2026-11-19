import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import {
  applySatelliteTheme,
  resolveSatelliteTheme,
  SatelliteHeader,
} from "@kitchen/common";

describe("satellite theme (kitchen#7)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    cleanup();
  });

  it("defaults to dark and persists ?theme=light from query string", () => {
    expect(resolveSatelliteTheme("ware-kds.theme", "")).toBe("dark");
    expect(resolveSatelliteTheme("ware-kds.theme", "?t=mobiware&theme=light")).toBe("light");
    expect(window.localStorage.getItem("ware-kds.theme")).toBe("light");
    expect(resolveSatelliteTheme("ware-kds.theme", "")).toBe("light");
  });

  it("toggles .dark class on documentElement", () => {
    applySatelliteTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applySatelliteTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("renders theme toggle button in SatelliteHeader", () => {
    const onToggleTheme = vi.fn();
    render(
      <SatelliteHeader
        title="MobiWare KDS"
        theme="dark"
        onToggleTheme={onToggleTheme}
      />,
    );

    const btn = screen.getByRole("button", { name: "Cambiar a tema claro" });
    fireEvent.click(btn);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});
