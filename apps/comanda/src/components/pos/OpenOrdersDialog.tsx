import { useEffect, useState } from "react";
import { Badge, Button } from "@kitchen/common";
import { listOpenOrders } from "../../lib/api";

type ListedOrder = NonNullable<
  Awaited<ReturnType<typeof listOpenOrders>>["items"]
>[number];

/**
 * `document_type` is returned by the fiscal checkout link (SPEC-W80f) and may
 * be present on hydrated order payloads even though the generated OpenAPI
 * Order schema does not expose it yet.
 */
export type OpenOrder = ListedOrder & {
  document_type?: string;
};

interface OpenOrdersDialogProps {
  onClose: () => void;
  onLoadOrder?: (order: OpenOrder) => void;
}

function paymentVariant(
  status?: string | null
): "amber" | "emerald" | "outline" {
  if (status === "UNPAID") return "amber";
  if (status === "PAID") return "emerald";
  return "outline";
}

export default function OpenOrdersDialog({
  onClose,
  onLoadOrder,
}: OpenOrdersDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OpenOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    listOpenOrders()
      .then((page) => {
        if (!cancelled) setOrders((page.items ?? []) as OpenOrder[]);
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
    <div
      data-accent="kitchen"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Órdenes abiertas</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
        {loading && (
          <p className="animate-pulse text-sm text-muted-foreground">
            Cargando…
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && orders.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay órdenes abiertas.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {orders.map((order) => {
            const isPaid = order.payment_status === "PAID";
            return (
              <li
                key={order.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    #{order.display_id ?? order.id?.slice(0, 8)}
                  </span>
                  <Badge variant={paymentVariant(order.payment_status)}>
                    {order.payment_status ?? "UNKNOWN"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.notes}
                </p>
                {isPaid ? (
                  <div
                    role="status"
                    className="mt-2 flex flex-col gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs"
                  >
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Liquidada en Caja
                    </span>
                    {order.retail_folio ? (
                      <span>Folio: {order.retail_folio}</span>
                    ) : null}
                    {order.document_type ? (
                      <span>Documento: {order.document_type}</span>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-2 flex justify-end">
                  <Button
                    variant={isPaid ? "secondary" : "accent"}
                    size="sm"
                    disabled={isPaid}
                    onClick={() => onLoadOrder?.(order)}
                  >
                    Cobrar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
