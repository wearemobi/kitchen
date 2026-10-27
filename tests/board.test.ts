import { describe, expect, it } from "vitest";
import {
  consolidateItems,
  detectNewTicketIds,
  formatElapsed,
  isActiveTicket,
  minutesElapsed,
  timerLevel,
} from "../src/lib/board";
import type { Ticket } from "../src/lib/api";

const NOW = Date.parse("2026-10-26T12:00:00Z");
const iso = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();

describe("timerLevel", () => {
  it("es verde bajo 15 minutos", () => {
    expect(timerLevel(iso(14.5), NOW)).toBe("green");
  });
  it("es ambar entre 15 y 25 minutos", () => {
    expect(timerLevel(iso(15), NOW)).toBe("amber");
    expect(timerLevel(iso(24), NOW)).toBe("amber");
  });
  it("es rojo sobre 25 minutos", () => {
    expect(timerLevel(iso(25.5), NOW)).toBe("red");
  });
  it("no rompe con fechas invalidas", () => {
    expect(timerLevel("no-es-fecha", NOW)).toBe("green");
    expect(minutesElapsed("no-es-fecha", NOW)).toBe(0);
  });
});

describe("formatElapsed", () => {
  it("formatea mm:ss", () => {
    expect(formatElapsed(iso(4.5), NOW)).toBe("04:30");
  });
  it("nunca devuelve negativos", () => {
    expect(formatElapsed(new Date(NOW + 60_000).toISOString(), NOW)).toBe("00:00");
  });
});

const ticket = (overrides: Partial<Ticket>): Ticket => ({
  id: overrides.id ?? crypto.randomUUID(),
  status: overrides.status ?? "PENDING",
  created_at: overrides.created_at ?? iso(1),
  ...overrides,
});

describe("consolidateItems", () => {
  it("suma cantidades por producto y ordena desc", () => {
    const tickets = [
      ticket({ items: [{ product_name: "Pupusa", quantity: 4 }, { product_name: "Hamburguesa", quantity: 2 }] }),
      ticket({ items: [{ product_name: "Pupusa", quantity: 8 }, { product_name: "Refresco", quantity: 1 }] }),
    ];
    expect(consolidateItems(tickets)).toEqual([
      { productName: "Pupusa", quantity: 12 },
      { productName: "Hamburguesa", quantity: 2 },
      { productName: "Refresco", quantity: 1 },
    ]);
  });

  it("excluye tickets terminales (READY, COMPLETED, CANCELLED)", () => {
    const tickets = [
      ticket({ status: "READY", items: [{ product_name: "Pupusa", quantity: 5 }] }),
      ticket({ status: "COMPLETED", items: [{ product_name: "Taco", quantity: 9 }] }),
      ticket({ status: "CANCELLED", items: [{ product_name: "Nachos", quantity: 3 }] }),
      ticket({ status: "IN_PROGRESS", items: [{ product_name: "Baleada", quantity: 2 }] }),
    ];
    expect(consolidateItems(tickets)).toEqual([{ productName: "Baleada", quantity: 2 }]);
  });

  it("ignora items sin nombre", () => {
    expect(consolidateItems([ticket({ items: [{ quantity: 2 }, { product_name: "", quantity: 3 }] })])).toEqual([]);
  });
});

describe("isActiveTicket", () => {
  it("PENDING e IN_PROGRESS son activos; terminales no", () => {
    expect(isActiveTicket(ticket({ status: "PENDING" }))).toBe(true);
    expect(isActiveTicket(ticket({ status: "IN_PROGRESS" }))).toBe(true);
    expect(isActiveTicket(ticket({ status: "READY" }))).toBe(false);
    expect(isActiveTicket(ticket({ status: "COMPLETED" }))).toBe(false);
    expect(isActiveTicket(ticket({ status: "CANCELLED" }))).toBe(false);
  });
});

describe("detectNewTicketIds", () => {
  it("solo devuelve ids nunca vistos", () => {
    const seen = new Set(["a"]);
    const stations = [{ tickets: [ticket({ id: "a" }), ticket({ id: "b" })] }, { tickets: [ticket({ id: "c" })] }];
    expect(detectNewTicketIds(seen, stations)).toEqual(["b", "c"]);
  });
});
