import { useEffect, useState } from "react";
import { formatElapsed, timerLevel, type TimerLevel } from "../../lib/board";

const TERMINAL_STATUSES = new Set(["READY", "COMPLETED", "CANCELLED"]);

const LEVEL_STYLES: Record<TimerLevel, string> = {
  green: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  red: "bg-red-500/20 text-red-400 animate-pulse",
};

interface OrderTimerProps {
  createdAt?: string;
  created_at?: string;
  completedAt?: string;
  completed_at?: string;
  status?: string;
  terminal?: boolean;
  isTerminal?: boolean;
  frozen?: boolean;
  endAt?: string;
  endTime?: string;
  completed?: string;
}

export default function OrderTimer(props: OrderTimerProps) {
  const created = props.createdAt ?? props.created_at ?? "";
  const finalIso =
    props.completedAt ??
    props.completed_at ??
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
      ? Date.parse(created)
      : Date.parse(finalIso as string)
    : NaN;
  const frozenMs = Number.isNaN(finalMs) ? Date.parse(created) : finalMs;

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
  const rawLevel = timerLevel(created, effectiveNow);
  const level: TimerLevel = terminal && rawLevel === "red" ? "amber" : rawLevel;

  return (
    <span
      data-testid="order-timer"
      data-level={level}
      data-frozen={terminal ? "true" : "false"}
      className={`rounded-lg px-2 py-1 font-mono text-sm font-bold tabular-nums ${LEVEL_STYLES[level]}`}
      aria-label={`Tiempo en preparación ${formatElapsed(created, effectiveNow)}`}
    >
      {formatElapsed(created, effectiveNow)}
    </span>
  );
}
