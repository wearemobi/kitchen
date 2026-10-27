
interface NavbarProps {
  search: string;
  onSearch: (value: string) => void;
  onOpenOrders: () => void;
  table: string;
}

export default function Navbar({ search, onSearch, onOpenOrders, table }: NavbarProps) {
  const operatorName = "Mesero";
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-3 py-2 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">MobiWare Comanda</p>
          <p className="text-xs text-zinc-400">
            {operatorName} · {table}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenOrders}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs"
          >
            Órdenes
          </button>
        </div>
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Buscar platillo…"
        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
      />
    </header>
  );
}
