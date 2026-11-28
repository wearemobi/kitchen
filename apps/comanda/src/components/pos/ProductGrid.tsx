import { useEffect, useState } from "react";
import { useCartStore } from "../../store/cart.store";
import { playAdd } from "../../lib/sounds";
import { fetchVaultDownloadUrl, type KitchenMenuItem } from "../../lib/api";

const COLUMN_CLASSES: Record<2 | 3 | 4 | 6, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6",
};

interface ProductGridProps {
  products: KitchenMenuItem[];
  columns?: 2 | 3 | 4 | 6;
}

export default function ProductGrid({ products, columns = 3 }: ProductGridProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    for (const product of products) {
      if (!product.image_file_id) continue;
      const key = product.id ?? product.sku ?? product.name ?? "";
      if (!key || imageUrls[key]) continue;
      fetchVaultDownloadUrl(product.image_file_id)
        .then((url) => {
          if (!cancelled) setImageUrls((current) => ({ ...current, [key]: url }));
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [products, imageUrls]);

  function money(value: number | undefined): string {
    if (value === undefined) return "—";
    return (value / 10000).toFixed(2);
  }

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin platillos disponibles en este menú.</p>;
  }

  return (
    <ul className={`grid gap-3 ${COLUMN_CLASSES[columns]}`}>
      {products.map((product, index) => {
        const key = product.id ?? product.sku ?? product.name ?? String(index);
        const imageUrl = product.image_file_id ? imageUrls[key] : undefined;
        const isOutOfStock = product.status === "OUT_OF_STOCK";
        const price = product.effective_price ?? product.effective_price_usd;

        return (
          <li key={key}>
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                if (isOutOfStock) return;
                addItem({
                  sku: product.sku ?? "",
                  name: product.name ?? "Producto",
                  unitPrice: price ?? 0,
                });
                playAdd();
              }}
              className={`flex h-full w-full flex-col justify-between rounded-2xl border border-border bg-card p-3 text-left text-card-foreground shadow-xs transition-colors ${
                isOutOfStock
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-accent-brand active:scale-[0.98]"
              }`}
            >
              <span className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.name ?? "Platillo"}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl" aria-hidden="true">
                    {product.emoji || "🍽️"}
                  </span>
                )}
                {isOutOfStock && (
                  <span className="absolute rounded-full bg-destructive/90 px-2 py-0.5 text-xs font-semibold text-white">
                    Agotado
                  </span>
                )}
              </span>
              <span className="mt-2 text-sm font-semibold leading-tight">{product.name}</span>
              {product.category_name && (
                <span className="mt-1 text-xs text-muted-foreground">{product.category_name}</span>
              )}
              <span className="mt-1 font-mono text-xs text-muted-foreground">{product.sku}</span>
              <span className="mt-3 flex items-end justify-between gap-2">
                <span className="text-base font-bold text-accent-brand">${money(price)}</span>
                {!!product.prep_time_minutes && product.prep_time_minutes > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {product.prep_time_minutes} min
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
