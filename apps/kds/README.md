# ware-kds — M.O.B.I.™ Kitchen Display System

Mini-app táctil para estaciones de cocina (Parrilla, Freidoras, Bebidas, Armado) sobre el
gateway soberano de [`wared`](https://github.com/wearemobi/wared) (`https://api.mobiware.app`).

Implementa [`SPEC-WKDS1`](https://github.com/wearemobi/wiki/blob/main/productos/facturacion-electronica/specs/ware1/SPEC-WKDS1.md)
(Hito 6 · v1.1 Órdenes, Kitchen & Satélites).

## Características

- **Login táctil por PIN** (6 dígitos, keypad propio sin teclado del SO) sobre
  `GET /v1/auth/cashiers` + `POST /v1/auth/login-pin` (SST token por tenant).
- **Board en tiempo real** (polling de `GET /v1/kitchen/board`): tickets por estación con
  ítems, cantidades, notas de platillo, contexto de orden (número, canal, mesa, cliente).
- **Cronómetro por comanda** con estados visuales: Verde `< 15m`, Ámbar `15–25m`,
  Rojo `> 25m` con animación de alerta.
- **Barra de ingredientes consolidados** por estación activa (solo tickets no terminales).
- **Alertas sonoras** con Web Audio API puro (sin MP3 externos) al llegar nuevas comandas.
- **Transiciones FSM de un toque** vía `POST /v1/kitchen/tickets/{id}/transitions`, con
  confirmación inline cuando la regla lo exige.

## Desarrollo

```bash
pnpm install
pnpm dev          # http://localhost:5175/?t=<tenant_id>
pnpm test         # Vitest + Testing Library
pnpm run lint     # tsc -b (typecheck)
pnpm run build    # producción
pnpm run api:gen  # regenerar tipos desde ../wared/api/openapi.yaml
```

El tenant se define por query string `?t=<tenant_id>` (se persiste en `localStorage`) o,
en su ausencia, `tenant_demo_sv`. La base URL de la API puede sobreescribirse con
`VITE_API_BASE_URL`.

## Stack

Vite + React 19 + TypeScript estricto + Tailwind CSS v4 + Zustand (sesión) +
`openapi-fetch` (cliente tipado contra el contrato de `wared`).

**Fuera de alcance:** configuración de estaciones/FSM (vive en `ware1`, `SPEC-W80c`) y
toma de pedidos/cobro (vive en `ware-comanda`, `SPEC-WCMD1`).
