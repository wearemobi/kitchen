import { useCartStore } from "../../store/cart.store";
import { playAdd } from "../../lib/sounds";
import type { Product } from "../../lib/api";

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const addItem = useCartStore((s) => s.addItem);

  function money(value: number | undefined): string {
    if (value === undefined) return "—";
    return (value / 10000).toFixed(2);
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {products.map((product) => (
        <li key={product.sku}>
          <button
            type="button"
            onClick={() => {
              addItem({
                sku: product.sku ?? "",
                name: product.name ?? "Producto",
                unitPrice: product.base_price ?? 0,
              });
              playAdd();
            }}
            className="flex h-full w-full flex-col justify-between rounded-2xl border border-border bg-card p-3 text-left text-card-foreground shadow-xs transition-colors hover:border-accent-brand active:scale-[0.98]"
          >
            <span className="text-sm font-semibold leading-tight">{product.name}</span>
            <span className="mt-2 font-mono text-xs text-muted-foreground">{product.sku}</span>
            <span className="mt-3 text-base font-bold text-accent-brand">${money(product.base_price)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
