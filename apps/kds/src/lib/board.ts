import type { Ticket, TicketItem } from "./api";

export type TimerLevel = "green" | "amber" | "red";

export const AMBER_THRESHOLD_MINUTES = 15;
export const RED_THRESHOLD_MINUTES = 25;

export function minutesElapsed(createdAtIso: string, nowMs: number): number {
  const created = Date.parse(createdAtIso);
  if (Number.isNaN(created)) return 0;
  return Math.max(0, (nowMs - created) / 60_000);
}

export function timerLevel(createdAtIso: string, nowMs: number): TimerLevel {
  const minutes = minutesElapsed(createdAtIso, nowMs);
  if (minutes > RED_THRESHOLD_MINUTES) return "red";
  if (minutes >= AMBER_THRESHOLD_MINUTES) return "amber";
  return "green";
}

export function formatElapsed(createdAtIso: string, nowMs: number): string {
  const totalSeconds = Math.floor(minutesElapsed(createdAtIso, nowMs) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export interface ConsolidatedEntry {
  productName: string;
  quantity: number;
}

const TERMINAL_STATUSES = new Set(["READY", "COMPLETED", "CANCELLED"]);

export function isActiveTicket(ticket: Ticket): boolean {
  return !ticket.status || !TERMINAL_STATUSES.has(ticket.status);
}

export function consolidateItems(tickets: Ticket[]): ConsolidatedEntry[] {
  const totals = new Map<string, number>();
  for (const ticket of tickets) {
    if (!isActiveTicket(ticket)) continue;
    for (const item of ticket.items ?? []) {
      const name = (item as TicketItem & { product_name?: string }).product_name ?? "";
      if (!name) continue;
      totals.set(name, (totals.get(name) ?? 0) + (item.quantity ?? 0));
    }
  }
  return [...totals.entries()]
    .map(([productName, quantity]) => ({ productName, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.productName.localeCompare(b.productName));
}

export function detectNewTicketIds(previous: Set<string>, stations: { tickets?: Ticket[] }[]): string[] {
  const fresh: string[] = [];
  for (const station of stations) {
    for (const ticket of station.tickets ?? []) {
      if (ticket.id && !previous.has(ticket.id)) {
        fresh.push(ticket.id);
      }
    }
  }
  return fresh;
}
