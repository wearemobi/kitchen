import { useEffect, useMemo, useState } from "react";
import {
  fetchProducts,
  createOrder,
  dispatchOrderToKitchen,
  resolveBusinessId,
  type Product,
} from "../../lib/api";
import { useCartStore } from "../../store/cart.store";
import { playSuccess } from "../../lib/sounds";
import Navbar from "./Navbar";
import ProductGrid from "./ProductGrid";
import Cart from "./Cart";
import OpenOrdersDialog from "./OpenOrdersDialog";

export default function PosScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const table = useCartStore((s) => s.table);
  const channel = useCartStore((s) => s.channel);
  const globalNotes = useCartStore((s) => s.globalNotes);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProducts()
      .then((list) => {
        if (!cancelled) setProducts(list.filter((p) => p.is_active !== false));
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }, [products, search]);

  async function handleSend() {
    if (items.length === 0 || sending) return;
    setSending(true);
    setSendError("");
    try {
      const businessId = await resolveBusinessId();
      const order = await createOrder({
        business_id: businessId,
        request_id: crypto.randomUUID(),
        order_type: channel === "DINE_IN" ? "DINE_IN" : channel === "TAKEAWAY" ? "TAKEAWAY" : "DELIVERY",
        source_channel: "POS",
        notes: `Mesa: ${table}. ${globalNotes}`.trim(),
        items: items.map((i) => ({
          sku: i.sku,
          name: i.name,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          notes: i.notes || undefined,
        })),
      });
      if (order?.id) {
        await dispatchOrderToKitchen(order.id, businessId);
      }
      clear();
      setCartOpen(false);
      playSuccess();
      setSuccessMessage(`Comanda enviada${order?.display_id ? ` · #${order.display_id}` : ""}`);
      window.setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Error enviando comanda.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Navbar
        search={search}
        onSearch={setSearch}
        onOpenOrders={() => setOrdersOpen(true)}
        table={table}
      />
      <main className="flex-1 overflow-y-auto p-3">
        {loading && <p className="animate-pulse text-sm text-zinc-400">Cargando catálogo…</p>}
        {error && (
          <p role="alert" className="rounded-lg bg-red-950 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {!loading && !error && <ProductGrid products={filtered} />}
      </main>

      {items.length > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950 shadow-lg"
        >
          Ver carrito ({items.length})
        </button>
      )}

      {cartOpen && (
        <Cart
          onClose={() => setCartOpen(false)}
          onSend={handleSend}
          sending={sending}
          sendError={sendError}
        />
      )}

      {ordersOpen && <OpenOrdersDialog onClose={() => setOrdersOpen(false)} />}

      {successMessage && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {successMessage}
        </div>
      )}
    </div>
  );
}
