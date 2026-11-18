import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchBoard, fireTransition, resolveTenantId, type BoardResponse, type Station, type Ticket, type TicketTransition } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { consolidateItems, detectNewTicketIds } from "../../lib/board";
import { playNewTicketChime, playTransitionSound } from "../../lib/sounds";
import TicketCard from "./TicketCard";
import ConsolidatedBar from "./ConsolidatedBar";

const POLL_INTERVAL_MS = 5000;

type ColumnCount = 2 | 3 | 4 | 6;
type FontScale = "sm" | "base" | "lg";

const COLUMN_CLASSES: Record<ColumnCount, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
  6: "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
};

const FONT_ZOOM: Record<FontScale, number> = { sm: 0.9, base: 1, lg: 1.15 };

interface KdsScreenProps {
  pollIntervalMs?: number;
}

export default function KdsScreen({ pollIntervalMs = POLL_INTERVAL_MS }: KdsScreenProps) {
  const token = useAuthStore((s) => s.token);
  const operatorName = useAuthStore((s) => s.operatorName);
  const operatorId = useAuthStore((s) => s.operatorId);
  const logout = useAuthStore((s) => s.logout);

  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [error, setError] = useState("");
  const [activeStationId, setActiveStationId] = useState("");
  const [busyTicketId, setBusyTicketId] = useState("");
  const seenTicketIds = useRef<Set<string>>(new Set());
  const [columns, setColumns] = useState<ColumnCount>(() => {
    const saved = Number(window.localStorage.getItem("ware-kds.columns"));
    return ([2, 3, 4, 6] as number[]).includes(saved) ? (saved as ColumnCount) : 3;
  });
  const [fontScale, setFontScale] = useState<FontScale>(() => {
    const saved = window.localStorage.getItem("ware-kds.fontScale");
    return saved === "sm" || saved === "lg" ? saved : "base";
  });

  const refresh = useCallback(async () => {
    // kitchen#1: after a 401 the shared interceptor clears the session; never
    // fire another polling request with the dead token.
    if (!useAuthStore.getState().token) return;
    try {
      const next = await fetchBoard();
      const stations = next.stations ?? [];
      const fresh = detectNewTicketIds(seenTicketIds.current, stations);
      for (const station of stations) {
        for (const ticket of station.tickets ?? []) {
          if (ticket.id) seenTicketIds.current.add(ticket.id);
        }
      }
      if (fresh.length > 0 && seenTicketIds.current.size > fresh.length) {
        playNewTicketChime();
      }
      setBoard(next);
      setActiveStationId((current) => {
        const all = stations.length > 0 ? [...stations, { id: "__all__" }] : stations;
        if (current && all.some((s) => s.id === current)) return current;
        return stations[0]?.id ?? "";
      });
      setError("");
    } catch (err) {
      // The 401 interceptor already logged the operator out; surfacing
      // "reintentando automáticamente" here would trap them in a dead board.
      if (!useAuthStore.getState().token) return;
      setError(err instanceof Error ? err.message : "Error de conexión con wared.");
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), pollIntervalMs);
    return () => window.clearInterval(interval);
  }, [refresh, pollIntervalMs, token]);

  useEffect(() => {
    window.localStorage.setItem("ware-kds.columns", String(columns));
  }, [columns]);

  useEffect(() => {
    window.localStorage.setItem("ware-kds.fontScale", fontScale);
  }, [fontScale]);

  const stations: Station[] = board?.stations ?? [];
  const allStation: Station = {
    id: "__all__",
    name: "Todas",
    icon: "📋",
    view_type: "queue",
    tickets: stations.flatMap((s) => s.tickets ?? []),
  } as Station;
  const navStations: Station[] = stations.length > 0 ? [...stations, allStation] : stations;
  const activeStation = navStations.find((s) => s.id === activeStationId);
  const tickets = activeStation?.tickets ?? [];

  const consolidated = useMemo(() => consolidateItems(tickets), [tickets]);

  async function handleTransition(ticket: Ticket, transition: TicketTransition) {
    if (!ticket.id || !transition.action_key) return;
    setBusyTicketId(ticket.id);
    try {
      await fireTransition(ticket.id, transition.action_key, operatorId, operatorName);
      playTransitionSound();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible ejecutar la transición.");
    } finally {
      setBusyTicketId("");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-black tracking-tight">MobiWare KDS</h1>
          <span className="text-xs text-zinc-500">{resolveTenantId()}</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-lg bg-zinc-800 px-2 py-1">
            Pendientes: <strong className="text-amber-400">{board?.stats?.pending_tickets ?? 0}</strong>
          </span>
          <span className="rounded-lg bg-zinc-800 px-2 py-1">
            En prep: <strong className="text-emerald-400">{board?.stats?.in_progress_tickets ?? 0}</strong>
          </span>
          <span className="rounded-lg bg-zinc-800 px-2 py-1">
            Prom: <strong>{(board?.stats?.avg_prep_time_minutes ?? 0).toFixed(1)}m</strong>
          </span>
          <span className="ml-2 rounded-lg bg-amber-500/15 px-2 py-1 font-semibold text-amber-400">{operatorName}</span>
          <div className="ml-2 flex items-center gap-1 rounded-lg bg-zinc-800 p-1 text-xs">
            {([2, 3, 4, 6] as ColumnCount[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setColumns(n)}
                aria-pressed={columns === n}
                className={`rounded-md px-2 py-1 font-bold ${columns === n ? "bg-amber-500 text-zinc-950" : "text-zinc-300 hover:bg-zinc-700"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-zinc-800 p-1 text-xs">
            {(["sm", "base", "lg"] as FontScale[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontScale(size)}
                aria-pressed={fontScale === size}
                className={`rounded-md px-2 py-1 font-bold ${fontScale === size ? "bg-amber-500 text-zinc-950" : "text-zinc-300 hover:bg-zinc-700"}`}
              >
                {size === "sm" ? "A-" : size === "lg" ? "A+" : "A"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-zinc-700 px-2 py-1 text-zinc-400 hover:bg-zinc-800"
          >
            Salir
          </button>
        </div>
      </header>

      {stations.length > 0 && (
        <nav aria-label="Estaciones de cocina" className="flex gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-4 py-2">
          {navStations.map((station) => {
            const count = (station.tickets ?? []).filter((t) => t.status === "PENDING").length;
            return (
              <button
                key={station.id}
                type="button"
                onClick={() => setActiveStationId(station.id ?? "")}
                aria-pressed={station.id === activeStationId}
                className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  station.id === activeStationId ? "bg-amber-500 text-zinc-950" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <span aria-hidden="true">{station.icon}</span>
                {station.name}
                {count > 0 && (
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs font-bold">{count}</span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {error && (
        <p role="alert" className="bg-red-950 px-4 py-2 text-sm text-red-300">
          {error} — reintentando automáticamente
        </p>
      )}

      <div className="border-b border-zinc-800/60 px-4 py-2">
        <ConsolidatedBar entries={consolidated} />
      </div>

      <main
        className={`grid flex-1 grid-cols-1 content-start gap-4 overflow-y-auto p-4 ${COLUMN_CLASSES[columns]}`}
        style={{ zoom: FONT_ZOOM[fontScale] }}
      >
        {board === null && !error && <p className="animate-pulse text-sm text-zinc-500">Cargando tablero…</p>}
        {board !== null && tickets.length === 0 && (
          <p className="col-span-full py-16 text-center text-sm text-zinc-500">Sin comandas en esta estación 🎉</p>
        )}
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onTransition={handleTransition}
            busy={busyTicketId === ticket.id}
          />
        ))}
      </main>
    </div>
  );
}
