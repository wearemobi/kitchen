import { useEffect, useState } from "react";
import type { Cashier, PinLoginResponse } from "../api/client";
import type { OperatorSession } from "./createAuthStore";
import { initials } from "../utils/initials";
import { PinModal } from "./PinModal";

export interface LoginScreenProps {
  title: string;
  subtitle: string;
  tenantId: string;
  operatorsAriaLabel?: string;
  accentColor?: "amber" | "emerald";
  fetchCashiers: () => Promise<Cashier[]>;
  loginWithPin: (username: string, pin: string) => Promise<PinLoginResponse>;
  onLoginSuccess: (session: OperatorSession) => void;
}

export function LoginScreen({
  title,
  subtitle,
  tenantId,
  operatorsAriaLabel = "Operadores",
  accentColor = "amber",
  fetchCashiers,
  loginWithPin,
  onLoginSuccess,
}: LoginScreenProps) {
  const [cashiers, setCashiers] = useState<Cashier[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<Cashier | null>(null);

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
  }, [fetchCashiers]);

  const buttonActiveBorder =
    accentColor === "emerald" ? "active:border-emerald-500" : "active:border-amber-500";
  const avatarBg =
    accentColor === "emerald"
      ? "bg-emerald-500/15 text-emerald-400"
      : "bg-amber-500/15 text-amber-400";

  return (
    <main className="flex h-full flex-col items-center justify-center gap-8 p-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {subtitle} · <span data-testid="tenant-badge">{tenantId}</span>
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
        <ul
          className="grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3"
          aria-label={operatorsAriaLabel}
        >
          {cashiers.map((cashier) => (
            <li key={cashier.id ?? cashier.username}>
              <button
                type="button"
                onClick={() => setSelected(cashier)}
                className={`flex w-full flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-600 ${buttonActiveBorder}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-16 items-center justify-center rounded-full text-xl font-bold ${avatarBg}`}
                >
                  {initials(cashier.display_name ?? cashier.username ?? "")}
                </span>
                <span className="text-sm font-medium">
                  {cashier.display_name ?? cashier.username}
                </span>
                <span className="text-xs text-zinc-500">{(cashier.roles ?? []).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <PinModal
          cashier={selected}
          tenantId={tenantId}
          accentColor={accentColor}
          onClose={() => setSelected(null)}
          onLoginSuccess={onLoginSuccess}
          loginWithPin={loginWithPin}
        />
      )}
    </main>
  );
}

export default LoginScreen;
