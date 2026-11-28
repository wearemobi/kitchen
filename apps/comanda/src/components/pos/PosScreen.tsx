import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button, type SatelliteTheme } from "@kitchen/common";
import {
  fetchBusinesses,
  fetchKitchenMenuItems,
  fetchKitchenMenus,
  createOrder,
  dispatchOrderToKitchen,
  resolveBusinessId,
  storeBusinessId,
  storedBusinessId,
  urlBusinessId,
  type Business,
  type KitchenMenu,
  type KitchenMenuItem,
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
  const [menuItems, setMenuItems] = useState<KitchenMenuItem[]>([]);
  const [menus, setMenus] = useState<KitchenMenu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
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
    async function loadMenu() {
      setLoading(true);
      setError("");
      try {
        const businessId = activeBusinessId || (await resolveBusinessId());
        const [items, availableMenus] = await Promise.all([
          fetchKitchenMenuItems(businessId, {
            activeNow: true,
            menuId: selectedMenuId || undefined,
          }),
          fetchKitchenMenus(businessId),
        ]);
        if (!cancelled) {
          setMenuItems(items);
          setMenus(availableMenus);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No fue posible cargar el menú de cocina.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadMenu();
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, selectedMenuId]);

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
    setSelectedMenuId("");
    setSelectedCategoryId("");
    storeBusinessId(businessId);
  }

  const categories = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of menuItems) {
      if (item.category_id) {
        byId.set(item.category_id, item.category_name ?? "Sin categoría");
      }
    }
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }, [menuItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (selectedCategoryId && item.category_id !== selectedCategoryId) return false;
      if (!q) return true;
      return item.name?.toLowerCase().includes(q) || item.sku?.toLowerCase().includes(q);
    });
  }, [menuItems, search, selectedCategoryId]);

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
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <select
          aria-label="Menú"
          value={selectedMenuId}
          onChange={(event) => {
            setSelectedMenuId(event.target.value);
            setSelectedCategoryId("");
          }}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Todos los menús</option>
          {menus
            .filter((menu) => menu.status !== "INACTIVE")
            .map((menu) => (
              <option key={menu.id ?? menu.name} value={menu.id ?? ""}>
                {menu.name}
              </option>
            ))}
        </select>
        <button
          type="button"
          aria-pressed={!selectedCategoryId}
          onClick={() => setSelectedCategoryId("")}
          className={`rounded-full border px-3 py-1.5 text-xs ${
            !selectedCategoryId
              ? "border-accent-brand bg-accent-brand/10 text-accent-brand"
              : "border-border text-muted-foreground"
          }`}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={selectedCategoryId === category.id}
            onClick={() => setSelectedCategoryId(category.id)}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              selectedCategoryId === category.id
                ? "border-accent-brand bg-accent-brand/10 text-accent-brand"
                : "border-border text-muted-foreground"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      <main
        className="flex-1 overflow-y-auto p-3"
        style={{ zoom: fontScale === "sm" ? 0.9 : fontScale === "lg" ? 1.12 : 1 }}
      >
        {loading && <p className="animate-pulse text-sm text-muted-foreground">Cargando menú…</p>}
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
