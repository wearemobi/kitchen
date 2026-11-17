import { useEffect, useState } from "react";
import { formatElapsed, timerLevel, type TimerLevel } from "../../lib/board";

const LEVEL_STYLES: Record<TimerLevel, string> = {
  green: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  red: "bg-red-500/20 text-red-400 animate-pulse",
};

interface OrderTimerProps {
  createdAt: string;
}

export default function OrderTimer({ createdAt }: OrderTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const level = timerLevel(createdAt, now);

  return (
    <span
      data-testid="order-timer"
      data-level={level}
      className={`rounded-lg px-2 py-1 font-mono text-sm font-bold tabular-nums ${LEVEL_STYLES[level]}`}
      aria-label={`Tiempo en preparación ${formatElapsed(createdAt, now)}`}
    >
      {formatElapsed(createdAt, now)}
    </span>
  );
}
