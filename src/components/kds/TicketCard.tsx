import { useState } from "react";
import type { Ticket, TicketTransition } from "../../lib/api";
import OrderTimer from "./OrderTimer";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En preparación",
  READY: "Lista",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

interface TicketCardProps {
  ticket: Ticket;
  onTransition: (ticket: Ticket, transition: TicketTransition) => void;
  busy?: boolean;
}

export default function TicketCard({ ticket, onTransition, busy = false }: TicketCardProps) {
  const [confirming, setConfirming] = useState<TicketTransition | null>(null);

  function handle(transition: TicketTransition) {
    if (transition.requires_confirmation) {
      setConfirming(transition);
      return;
    }
    onTransition(ticket, transition);
  }

  return (
    <article
      data-testid={`ticket-${ticket.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-lg"
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-black leading-none">{ticket.order_number}</p>
          <p className="mt-1 text-xs text-zinc-400">
            {[ticket.channel, ticket.table_number, ticket.customer_name].filter(Boolean).join(" · ")}
          </p>
        </div>
        {ticket.created_at && <OrderTimer createdAt={ticket.created_at} />}
      </header>

      <p className="w-fit rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
        {STATUS_LABELS[ticket.status ?? ""] ?? ticket.status}
      </p>

      <ul className="flex flex-col gap-1.5">
        {(ticket.items ?? []).map((item, index) => (
          <li key={`${item.product_id ?? item.product_name}-${index}`} className="text-sm leading-snug">
            <span className="mr-2 inline-block min-w-7 rounded bg-zinc-800 px-1.5 text-center font-bold text-amber-400">
              {item.quantity}
            </span>
            <span className="font-medium">{item.product_name}</span>
            {item.notes && <p className="ml-9 text-xs italic text-orange-300">{item.notes}</p>}
          </li>
        ))}
      </ul>

      {ticket.notes && (
        <p className="rounded-lg bg-zinc-800/70 px-3 py-2 text-xs text-zinc-300">📝 {ticket.notes}</p>
      )}

      <footer className="mt-auto">
        {confirming ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-red-950/60 p-2">
            <span className="text-xs text-red-200">¿{confirming.action_label}?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  onTransition(ticket, confirming);
                  setConfirming(null);
                }}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm font-bold text-zinc-950"
              >
                Confirmar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(ticket.available_transitions ?? []).map((transition) => (
              <button
                key={transition.id ?? transition.action_key}
                type="button"
                disabled={busy}
                onClick={() => handle(transition)}
                className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                  transition.target_status === "READY" || transition.target_status === "COMPLETED"
                    ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                    : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                }`}
              >
                {transition.action_label}
              </button>
            ))}
            {(ticket.available_transitions ?? []).length === 0 && (
              <p className="text-center text-xs text-zinc-500">Sin acciones disponibles</p>
            )}
          </div>
        )}
      </footer>
    </article>
  );
}
