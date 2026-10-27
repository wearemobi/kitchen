import { useEffect, useState } from "react";
import { fetchCashiers, resolveTenantId, type Cashier } from "../../lib/api";
import PinModal from "./PinModal";

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function LoginScreen() {
  const [cashiers, setCashiers] = useState<Cashier[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<Cashier | null>(null);
  const tenantId = resolveTenantId();

  useEffect(() => {
    let cancelled = false;
    fetchCashiers()
      .then((list) => {
        if (!cancelled) setCashiers(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 p-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">MobiWare Comanda</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Mesero · <span data-testid="tenant-badge">{tenantId}</span>
        </p>
      </header>

      {loadError && (
        <p role="alert" className="rounded-lg bg-red-950 px-4 py-2 text-sm text-red-300">
          {loadError}
        </p>
      )}

      {!loadError && cashiers === null && (
        <p className="animate-pulse text-sm text-zinc-400">Cargando operadores…</p>
      )}

      {cashiers !== null && cashiers.length === 0 && (
        <p className="text-sm text-zinc-400">No hay operadores activos para este tenant.</p>
      )}

      {cashiers !== null && cashiers.length > 0 && (
        <ul className="grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Operadores de sala">
          {cashiers.map((cashier) => (
            <li key={cashier.id ?? cashier.username}>
              <button
                type="button"
                onClick={() => setSelected(cashier)}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-600 active:border-emerald-500"
              >
                <span
                  aria-hidden="true"
                  className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-xl font-bold text-emerald-400"
                >
                  {initials(cashier.display_name ?? cashier.username ?? "")}
                </span>
                <span className="text-sm font-medium">{cashier.display_name ?? cashier.username}</span>
                <span className="text-xs text-zinc-500">{(cashier.roles ?? []).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && <PinModal cashier={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
