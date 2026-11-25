import { useEffect, useState } from "react";
import { formatElapsed, oldestActiveStationStart, stationStartTime, stationTimerLevel, type TimerLevel } from "../../lib/board";

const TERMINAL_STATUSES = new Set(["READY", "COMPLETED", "CANCELLED"]);

const LEVEL_STYLES: Record<TimerLevel, string> = {
  green: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  red: "bg-red-500/20 text-red-400 animate-pulse",
};

interface StationTimerProps {
  station?: { tickets?: unknown[] } | null;
  tickets?: unknown[] | null;
  startedAt?: string;
  started_at?: string;
  createdAt?: string;
  created_at?: string;
  completedAt?: string;
  completed_at?: string;
  readyAt?: string;
  ready_at?: string;
  status?: string;
  terminal?: boolean;
  isTerminal?: boolean;
  frozen?: boolean;
  endAt?: string;
  endTime?: string;
  completed?: string;
  now?: number;
}

export default function StationTimer(props: StationTimerProps) {
  const stationStart =
    props.station != null
      ? stationStartTime(props.station as never)
      : props.tickets != null
        ? oldestActiveStationStart(props.tickets as never)
        : undefined;
  const started =
    props.startedAt ?? props.started_at ?? props.createdAt ?? props.created_at ?? stationStart ?? "";
  const finalIso =
    props.completedAt ??
    props.completed_at ??
    props.readyAt ??
    props.ready_at ??
    props.endAt ??
    props.endTime ??
    props.completed ??
    undefined;
  const statusTerminal = props.status != null ? TERMINAL_STATUSES.has(props.status) : false;
  const terminal =
    statusTerminal ||
    Boolean(props.terminal || props.isTerminal || props.frozen) ||
    Boolean(finalIso);

  const finalMs = terminal
    ? Number.isNaN(Date.parse(finalIso ?? ""))
      ? Date.parse(started)
      : Date.parse(finalIso as string)
    : NaN;
  const frozenMs = Number.isNaN(finalMs) ? Date.parse(started) : finalMs;

  const [now, setNow] = useState(() => (terminal ? frozenMs : Date.now()));

  useEffect(() => {
    if (terminal) {
      setNow(frozenMs);
      return;
    }
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [terminal, frozenMs]);

  const effectiveNow = terminal ? frozenMs : now;
  const level = stationTimerLevel(started, effectiveNow);

  return (
    <span
      data-testid="station-timer"
      data-level={level}
      data-frozen={terminal ? "true" : "false"}
      className={`rounded-lg px-2 py-1 font-mono text-sm font-bold tabular-nums ${LEVEL_STYLES[level]}`}
      aria-label={`Tiempo en estación ${formatElapsed(started, effectiveNow)}`}
    >
      {formatElapsed(started, effectiveNow)}
    </span>
  );
}