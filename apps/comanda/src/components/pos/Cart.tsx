import { useState } from "react";
import { Badge } from "@kitchen/common";
import { useCartStore } from "../../store/cart.store";
import { playRemove } from "../../lib/sounds";

export interface SettledOrder {
  payment_status?: string | null;
  retail_folio?: string;
  document_type?: string;
}

interface CartProps {
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  sendError: string;
  /** Operative order currently loaded into the cart (SPEC-KSAT4). */
  loadedOrder?: SettledOrder | null;
}

function money(value: number): string {
  return (value / 10000).toFixed(2);
}

export default function Cart({
  onClose,
  onSend,
  sending,
  sendError,
  loadedOrder,
}: CartProps) {
  const items = useCartStore((s) => s.items);
  const table = useCartStore((s) => s.table);
  const channel = useCartStore((s) => s.channel);
  const globalNotes = useCartStore((s) => s.globalNotes);
  const setTable = useCartStore((s) => s.setTable);
  const setChannel = useCartStore((s) => s.setChannel);
  const setGlobalNotes = useCartStore((s) => s.setGlobalNotes);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const removeItem = useCartStore((s) => s.removeItem);
  const setNotes = useCartStore((s) => s.setNotes);

  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const total = items.reduce((acc, i) => acc + Math.round((i.quantity * i.unitPrice) / 10000), 0);
  const isSettled = loadedOrder?.payment_status === "PAID";

  return (
    <div
      data-accent="kitchen"
      className="fixed inset-0 z-40 flex items-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Carrito</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800">
            ✕
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            value={table}
            onChange={(e) => setTable(e.target.value)}
            disabled={isSettled}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm disabled:opacity-50"
            placeholder="Mesa"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as "DINE_IN" | "TAKEAWAY" | "DELIVERY")}
            disabled={isSettled}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="DINE_IN">En mesa</option>
            <option value="TAKEAWAY">Para llevar</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>

        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.sku} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-zinc-400">${money(item.unitPrice)} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      decrement(item.sku);
                      playRemove();
                    }}
                    disabled={isSettled}
                    className="size-8 rounded-lg bg-zinc-800 disabled:opacity-50"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity / 10000}</span>
                  <button
                    type="button"
                    onClick={() => increment(item.sku)}
                    disabled={isSettled}
                    className="size-8 rounded-lg bg-zinc-800 disabled:opacity-50"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.sku)}
                    disabled={isSettled}
                    className="ml-1 text-xs text-destructive disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <input
                value={noteDraft[item.sku] ?? item.notes}
                onChange={(e) => setNoteDraft((d) => ({ ...d, [item.sku]: e.target.value }))}
                onBlur={() => setNotes(item.sku, noteDraft[item.sku] ?? item.notes)}
                disabled={isSettled}
                placeholder="Nota del ítem…"
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs disabled:opacity-50"
              />
            </li>
          ))}
        </ul>

        <textarea
          value={globalNotes}
          onChange={(e) => setGlobalNotes(e.target.value)}
          disabled={isSettled}
          placeholder="Notas generales de la comanda…"
          className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm disabled:opacity-50"
          rows={2}
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-zinc-400">Total</span>
          <span className="text-lg font-bold text-emerald-400">${money(total)}</span>
        </div>

        {isSettled ? (
          <div
            role="status"
            className="mt-3 flex flex-col gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3"
          >
            <Badge variant="emerald">Orden Liquidada en Caja</Badge>
            {loadedOrder?.retail_folio ? (
              <p className="text-xs text-muted-foreground">
                Folio: {loadedOrder.retail_folio}
              </p>
            ) : null}
            {loadedOrder?.document_type ? (
              <p className="text-xs text-muted-foreground">
                Documento: {loadedOrder.document_type}
              </p>
            ) : null}
          </div>
        ) : null}

        {sendError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {sendError}
          </p>
        )}

        <button
          type="button"
          onClick={onSend}
          disabled={sending || items.length === 0 || isSettled}
          className="mt-3 h-14 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-zinc-950 transition-opacity disabled:opacity-40"
        >
          {sending ? "Enviando…" : "Enviar a Cocina"}
        </button>
      </div>
    </div>
  );
}
