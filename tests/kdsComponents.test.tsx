import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import OrderTimer from "../src/components/kds/OrderTimer";
import ConsolidatedBar from "../src/components/kds/ConsolidatedBar";

const NOW = Date.parse("2026-10-26T12:00:00Z");
const iso = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("OrderTimer", () => {
  it.each([
    [5, "green"],
    [17, "amber"],
    [31, "red"],
  ])("usa nivel %s -> %s", (minutesAgo, level) => {
    render(<OrderTimer createdAt={iso(minutesAgo)} />);
    expect(screen.getByTestId("order-timer")).toHaveAttribute("data-level", level);
  });

  it("cronometea mm:ss", () => {
    render(<OrderTimer createdAt={iso(2)} />);
    expect(screen.getByTestId("order-timer").textContent).toBe("02:00");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("order-timer").textContent).toBe("02:01");
  });
});

describe("ConsolidatedBar", () => {
  it("lista ingredientes consolidados", () => {
    render(<ConsolidatedBar entries={[{ productName: "Pupusa", quantity: 12 }, { productName: "Taco", quantity: 4 }]} />);
    const bar = screen.getByTestId("consolidated-bar");
    expect(bar).toHaveTextContent("12×");
    expect(bar).toHaveTextContent("Pupusa");
    expect(bar).toHaveTextContent("4×");
    expect(bar).toHaveTextContent("Taco");
  });

  it("no se renderiza sin entradas", () => {
    const { container } = render(<ConsolidatedBar entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
