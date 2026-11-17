import type { ConsolidatedEntry } from "../../lib/board";

interface ConsolidatedBarProps {
  entries: ConsolidatedEntry[];
}

export default function ConsolidatedBar({ entries }: ConsolidatedBarProps) {
  if (entries.length === 0) return null;
  return (
    <div
      data-testid="consolidated-bar"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-sm"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Por preparar:</span>
      {entries.map((entry) => (
        <span key={entry.productName} className="font-medium text-zinc-200">
          <span className="font-bold text-amber-400">{entry.quantity}×</span> {entry.productName}
        </span>
      ))}
    </div>
  );
}
