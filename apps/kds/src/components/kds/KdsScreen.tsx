import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChefHat, History, LayoutGrid } from "lucide-react";
import { Badge, Button, SatelliteHeader, cn } from "@kitchen/common";
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
  const [showCompleted, setShowCompleted] = useState(false);

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
    icon: "",
    view_type: "queue",
    tickets: stations.flatMap((s) => s.tickets ?? []),
  } as Station;
  const navStations: Station[] = stations.length > 0 ? [...stations, allStation] : stations;
  const activeStation = navStations.find((s) => s.id === activeStationId);
  const tickets = activeStation?.tickets ?? [];
  const completedCount = tickets.filter(
    (t) => t.status === "COMPLETED" || t.status === "CANCELLED",
  ).length;
  const visibleTickets = showCompleted
    ? tickets
    : tickets.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");

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
    <div className="flex h-full flex-col bg-background text-foreground">
      <SatelliteHeader
        title="MobiWare KDS"
        tenantId={resolveTenantId()}
        icon={<ChefHat className="h-4 w-4" aria-hidden="true" />}
        metrics={[
          {
            label: "Pendientes",
            value: board?.stats?.pending_tickets ?? 0,
            valueClassName: "text-amber-400",
          },
          {
            label: "En prep",
            value: board?.stats?.in_progress_tickets ?? 0,
            valueClassName: "text-emerald-400",
          },
          {
            label: "Prom",
            value: `${(board?.stats?.avg_prep_time_minutes ?? 0).toFixed(1)}m`,
          },
        ]}
        operatorName={operatorName}
        controls={
          <>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
              {([2, 3, 4, 6] as ColumnCount[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setColumns(n)}
                  aria-pressed={columns === n}
                  className={cn(
                    "rounded-md px-2 py-1 font-bold transition-colors",
                    columns === n
                      ? "bg-accent-brand text-accent-brand-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
              {(["sm", "base", "lg"] as FontScale[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFontScale(size)}
                  aria-pressed={fontScale === size}
                  className={cn(
                    "rounded-md px-2 py-1 font-bold transition-colors",
                    fontScale === size
                      ? "bg-accent-brand text-accent-brand-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {size === "sm" ? "A-" : size === "lg" ? "A+" : "A"}
                </button>
              ))}
            </div>
          </>
        }
        actions={
          completedCount > 0 ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowCompleted((v) => !v)}
              className="h-7 text-muted-foreground hover:text-foreground"
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {showCompleted
                  ? "Ocultar historial / Ocultar completadas"
                  : `Historial (${completedCount}) / Ver completadas`}
              </span>
            </Button>
          ) : undefined
        }
        onLogout={logout}
      />

      {stations.length > 0 && (
        <nav aria-label="Estaciones de cocina" className="flex gap-2 overflow-x-auto border-b border-border bg-card/60 px-4 py-2">
          {navStations.map((station) => {
            const count = (station.tickets ?? []).filter((t) => t.status === "PENDING").length;
            const active = station.id === activeStationId;
            return (
              <button
                key={station.id}
                type="button"
                onClick={() => setActiveStationId(station.id ?? "")}
                aria-pressed={active}
                className={cn(
                  "flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-accent-brand text-accent-brand-foreground shadow-xs"
                    : "border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {station.id === "__all__" ? (
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                ) : (
                  station.icon && <span aria-hidden="true">{station.icon}</span>
                )}
                {station.name}
                {count > 0 && (
                  <Badge
                    variant={active ? "secondary" : "amber"}
                    className="rounded-full px-2 py-0 text-[11px] font-bold"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {error && (
        <p role="alert" className="border-b border-destructive/30 bg-destructive/15 px-4 py-2 text-sm text-destructive">
          {error} — reintentando automáticamente
        </p>
      )}

      <div className="border-b border-border/60 px-4 py-2">
        <ConsolidatedBar entries={consolidated} />
      </div>

      <main
        className={`grid flex-1 grid-cols-1 content-start gap-4 overflow-y-auto p-4 ${COLUMN_CLASSES[columns]}`}
        style={{ zoom: FONT_ZOOM[fontScale] }}
      >
        {board === null && !error && <p className="animate-pulse text-sm text-muted-foreground">Cargando tablero…</p>}
        {board !== null && visibleTickets.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-accent-brand/70" aria-hidden="true" />
            <p>Sin comandas en esta estación</p>
          </div>
        )}
        {visibleTickets.map((ticket) => (
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
