import { ClipboardList, Search, UtensilsCrossed } from "lucide-react";
import { Button, Badge, Input, SatelliteHeader, cn, type SatelliteTheme } from "@kitchen/common";
import { resolveTenantId, type Business } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

export type ComandaColumnCount = 2 | 3 | 4 | 6;
export type ComandaFontScale = "sm" | "base" | "lg";

interface NavbarProps {
  search: string;
  onSearch: (value: string) => void;
  onOpenOrders: () => void;
  table: string;
  cartCount?: number;
  columns?: ComandaColumnCount;
  onColumnsChange?: (columns: ComandaColumnCount) => void;
  fontScale?: ComandaFontScale;
  onFontScaleChange?: (scale: ComandaFontScale) => void;
  theme?: SatelliteTheme;
  onToggleTheme?: () => void;
  businesses?: Business[];
  activeBusinessId?: string;
  onBusinessChange?: (businessId: string) => void;
}

export default function Navbar({
  search,
  onSearch,
  onOpenOrders,
  table,
  cartCount = 0,
  columns = 3,
  onColumnsChange,
  fontScale = "base",
  onFontScaleChange,
  theme,
  onToggleTheme,
  businesses = [],
  activeBusinessId = "",
  onBusinessChange = () => {},
}: NavbarProps) {
  const operatorName = useAuthStore((s) => s.operatorName) || "Mesero";
  const logout = useAuthStore((s) => s.logout);

  return (
    <SatelliteHeader
      title="MobiWare Comanda"
      tenantId={resolveTenantId()}
      icon={<UtensilsCrossed className="h-4 w-4" aria-hidden="true" />}
      metrics={[
        {
          label: "Mesa",
          value: table,
        },
        {
          label: "Carrito",
          value: cartCount,
          valueClassName: cartCount > 0 ? "text-emerald-600 dark:text-emerald-400" : undefined,
        },
      ]}
      operatorName={operatorName}
      controls={
        <>
          {businesses.length > 1 ? (
            <select
              aria-label="Negocio activo"
              value={activeBusinessId}
              onChange={(event) => onBusinessChange(event.target.value)}
              className="h-7 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground"
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          ) : businesses.length === 1 ? (
            <Badge variant="outline" className="text-[10px]">
              {businesses[0]?.name}
            </Badge>
          ) : null}
          {onColumnsChange && (
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
              {([2, 3, 4, 6] as ComandaColumnCount[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onColumnsChange(n)}
                  aria-pressed={columns === n}
                  className={cn(
                    "rounded-md px-2 py-1 font-bold transition-colors",
                    columns === n
                      ? "bg-accent-brand text-accent-brand-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          {onFontScaleChange && (
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
              {(["sm", "base", "lg"] as ComandaFontScale[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onFontScaleChange(size)}
                  aria-pressed={fontScale === size}
                  className={cn(
                    "rounded-md px-2 py-1 font-bold transition-colors",
                    fontScale === size
                      ? "bg-accent-brand text-accent-brand-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {size === "sm" ? "A-" : size === "lg" ? "A+" : "A"}
                </button>
              ))}
            </div>
          )}
        </>
      }
      actions={
        <Button variant="outline" size="xs" onClick={onOpenOrders} className="h-7">
          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Órdenes</span>
        </Button>
      }
      theme={theme}
      onToggleTheme={onToggleTheme}
      onLogout={logout}
      bottomSlot={
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar platillo…"
            className="pl-9 focus-visible:ring-accent-brand"
          />
        </div>
      }
    />
  );
}
