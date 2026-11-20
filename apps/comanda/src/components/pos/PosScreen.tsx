import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button, type SatelliteTheme } from "@kitchen/common";
import {
  fetchBusinesses,
  fetchProducts,
  createOrder,
  dispatchOrderToKitchen,
  resolveBusinessId,
  storeBusinessId,
  storedBusinessId,
  urlBusinessId,
  type Business,
  type Product,
} from "../../lib/api";
import { useCartStore } from "../../store/cart.store";
import { playSuccess } from "../../lib/sounds";
import Navbar, { type ComandaColumnCount, type ComandaFontScale } from "./Navbar";
import ProductGrid from "./ProductGrid";
import Cart from "./Cart";
import OpenOrdersDialog from "./OpenOrdersDialog";

interface PosScreenProps {
  theme?: SatelliteTheme;
  onToggleTheme?: () => void;
}

export default function PosScreen({ theme, onToggleTheme }: PosScreenProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState(urlBusinessId);
  const [columns, setColumns] = useState<ComandaColumnCount>(() => {
    const saved = Number(window.localStorage.getItem("ware-comanda.columns"));
    return ([2, 3, 4, 6] as number[]).includes(saved) ? (saved as ComandaColumnCount) : 3;
  });
  const [fontScale, setFontScale] = useState<ComandaFontScale>(() => {
    const saved = window.localStorage.getItem("ware-comanda.fontScale");
    return saved === "sm" || saved === "lg" ? saved : "base";
  });

  useEffect(() => {
    window.localStorage.setItem("ware-comanda.columns", String(columns));
  }, [columns]);

  useEffect(() => {
    window.localStorage.setItem("ware-comanda.fontScale", fontScale);
  }, [fontScale]);

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

  useEffect(() => {
    let cancelled = false;
    fetchBusinesses()
      .then((list) => {
        if (cancelled) return;
        setBusinesses(list);
        const chosen =
          list.find((business) => business.id === activeBusinessId)?.id ??
          list.find((business) => business.id === storedBusinessId())?.id ??
          list[0]?.id ??
          "";
        if (chosen) {
          setActiveBusinessId(chosen);
          storeBusinessId(chosen);
        }
      })
      .catch(() => {
        // Comanda stays usable with the cart even if the list fails.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBusinessChange(businessId: string) {
    setActiveBusinessId(businessId);
    storeBusinessId(businessId);
  }

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
      const businessId = activeBusinessId || (await resolveBusinessId());
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
    <div className="flex h-full flex-col bg-background text-foreground">
      <Navbar
        search={search}
        onSearch={setSearch}
        onOpenOrders={() => setOrdersOpen(true)}
        table={table}
        cartCount={items.length}
        columns={columns}
        onColumnsChange={setColumns}
        fontScale={fontScale}
        onFontScaleChange={setFontScale}
        theme={theme}
        onToggleTheme={onToggleTheme}
        businesses={businesses}
        activeBusinessId={activeBusinessId}
        onBusinessChange={handleBusinessChange}
      />
      <main
        className="flex-1 overflow-y-auto p-3"
        style={{ zoom: fontScale === "sm" ? 0.9 : fontScale === "lg" ? 1.12 : 1 }}
      >
        {loading && <p className="animate-pulse text-sm text-muted-foreground">Cargando catálogo…</p>}
        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/15 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {!loading && !error && <ProductGrid products={filtered} columns={columns} />}
      </main>

      {items.length > 0 && (
        <Button
          variant="accent"
          size="lg"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full px-6 shadow-lg"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          <span>Ver carrito ({items.length})</span>
        </Button>
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
