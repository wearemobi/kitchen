import { useEffect, useState } from "react";
import { listOpenOrders } from "../../lib/api";

interface OpenOrdersDialogProps {
  onClose: () => void;
}

export default function OpenOrdersDialog({ onClose }: OpenOrdersDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<
    NonNullable<Awaited<ReturnType<typeof listOpenOrders>>["items"]>
  >([]);

  useEffect(() => {
    let cancelled = false;
    listOpenOrders()
      .then((page) => {
        if (!cancelled) setOrders(page.items ?? []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Órdenes abiertas</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800">
            ✕
          </button>
        </div>
        {loading && <p className="animate-pulse text-sm text-zinc-400">Cargando…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!loading && !error && orders.length === 0 && (
          <p className="text-sm text-zinc-400">No hay órdenes abiertas.</p>
        )}
        <ul className="space-y-2">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">#{order.display_id ?? order.id?.slice(0, 8)}</span>
                <span className="text-zinc-400">{order.status}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{order.notes}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
