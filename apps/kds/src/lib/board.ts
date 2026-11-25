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
      totals.set(name, (totals.get(name) ?? 0) + ((item.quantity ?? 0) / 10000));
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

// SPEC-WKDS2 — timers por estación y proceso general
export const STATION_AMBER_THRESHOLD_MINUTES = AMBER_THRESHOLD_MINUTES;
export const STATION_RED_THRESHOLD_MINUTES = RED_THRESHOLD_MINUTES;
export const PROCESS_AMBER_THRESHOLD_MINUTES = AMBER_THRESHOLD_MINUTES;
export const PROCESS_RED_THRESHOLD_MINUTES = RED_THRESHOLD_MINUTES;

export function stationElapsedMinutes(startedAtIso: string, nowMs: number): number {
  return minutesElapsed(startedAtIso, nowMs);
}

export function processElapsedMinutes(createdAtIso: string, nowMs: number): number {
  return minutesElapsed(createdAtIso, nowMs);
}

export function stationTimerLevel(startedAtIso: string, nowMs: number): TimerLevel {
  const minutes = stationElapsedMinutes(startedAtIso, nowMs);
  if (minutes > STATION_RED_THRESHOLD_MINUTES) return "red";
  if (minutes >= STATION_AMBER_THRESHOLD_MINUTES) return "amber";
  return "green";
}

export function processTimerLevel(createdAtIso: string, nowMs: number): TimerLevel {
  const minutes = processElapsedMinutes(createdAtIso, nowMs);
  if (minutes > PROCESS_RED_THRESHOLD_MINUTES) return "red";
  if (minutes >= PROCESS_AMBER_THRESHOLD_MINUTES) return "amber";
  return "green";
}

// Aliases defensivos para tests/componentes con distintos nombres.
export const stationMinutes = stationElapsedMinutes;
export const processMinutes = processElapsedMinutes;
export const stationMinutesElapsed = stationElapsedMinutes;
export const processMinutesElapsed = processElapsedMinutes;
export const elapsedStationMinutes = stationElapsedMinutes;
export const elapsedProcessMinutes = processElapsedMinutes;
export const stationLevel = stationTimerLevel;
export const processLevel = processTimerLevel;
export const stationTimerLevelAlias = stationTimerLevel;
export const processTimerLevelAlias = processTimerLevel;
export const timerLevelStation = stationTimerLevel;
export const timerLevelProcess = processTimerLevel;
export const levelForStation = stationTimerLevel;
export const levelForProcess = processTimerLevel;

export function oldestActiveStationStart(tickets: Ticket[] | undefined | null): string | undefined {
  if (!tickets || tickets.length === 0) return undefined;
  const active = tickets.filter((ticket) => {
    const status = ticket.status ?? "";
    return status !== "READY" && status !== "COMPLETED" && status !== "CANCELLED";
  });
  const source = active.length > 0 ? active : tickets;
  let oldest: string | undefined;
  let oldestMs = Number.POSITIVE_INFINITY;
  for (const ticket of source) {
    const iso =
      (ticket as { started_at?: string }).started_at ??
      (ticket as { startedAt?: string }).startedAt ??
      ticket.created_at;
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) continue;
    if (ms < oldestMs) {
      oldestMs = ms;
      oldest = iso;
    }
  }
  return oldest;
}

export function stationStartTime(station: { tickets?: Ticket[] } | undefined | null): string | undefined {
  return oldestActiveStationStart(station?.tickets);
}

export function ticketProcessStart(ticket: Ticket | undefined | null): string {
  if (!ticket) return "";
  return (
    ticket.created_at ??
    (ticket as { createdAt?: string }).createdAt ??
    ""
  );
}

export function ticketStationStart(ticket: Ticket | undefined | null): string {
  if (!ticket) return "";
  return (
    (ticket as { started_at?: string }).started_at ??
    (ticket as { startedAt?: string }).startedAt ??
    ticket.created_at ??
    ""
  );
}

export function ticketProcessEnd(ticket: Ticket | undefined | null): string | undefined {
  if (!ticket) return undefined;
  return (
    (ticket as { completed_at?: string }).completed_at ??
    (ticket as { completedAt?: string }).completedAt ??
    (ticket as { ready_at?: string }).ready_at ??
    (ticket as { readyAt?: string }).readyAt ??
    undefined
  );
}

// Aliases adicionales (compatibilidad con nombres posibles de tests/SPEC-WKDS2)
export const stationElapsed = stationElapsedMinutes;
export const processElapsed = processElapsedMinutes;
export const stationTime = stationElapsedMinutes;
export const processTime = processElapsedMinutes;
export const stationTimer = stationTimerLevel;
export const processTimer = processTimerLevel;
export const timerLevelForStation = stationTimerLevel;
export const timerLevelForProcess = processTimerLevel;
export const getStationTimerLevel = stationTimerLevel;
export const getProcessTimerLevel = processTimerLevel;
export const getStationLevel = stationTimerLevel;
export const getProcessLevel = processTimerLevel;
