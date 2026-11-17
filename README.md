# M.O.B.I.™ Kitchen & Sala Satellite Apps Monorepo (`kitchen`)

> **Monorepo:** `github.com/wearemobi/kitchen`  
> **Estado:** 🚀 Producción (`SPEC-WSAT3` / Hito 6 · v1.1 Órdenes, Kitchen & Satélites)  
> **Backend Provider:** `github.com/wearemobi/wared` (`https://api.mobiware.app`)  
> **Hosting Edge:** Cloudflare Workers / Custom Domains  

---

## 1. Arquitectura del Monorepo

Monorepo ligero gestionado con **pnpm workspaces** que unifica las aplicaciones satélite táctiles de restaurante y cocina:

```text
kitchen/
├── pnpm-workspace.yaml
├── package.json                   # Scripts raíz (build, test, lint, deploy)
├── tsconfig.base.json             # Configuración base de TypeScript
├── .github/workflows/ci.yml       # CI unificado (Lint, Vitest, Vite build)
│
├── packages/
│   └── common/                    # @kitchen/common (código compartido)
│       ├── src/auth/              # LoginScreen, PinModal, createAuthStore
│       ├── src/api/               # Cliente openapi-fetch, tenant resolution, schema.d.ts
│       ├── src/audio/             # Web Audio API (chimes, clicks, feedback)
│       └── src/utils/             # formatMoney, initials
│
└── apps/
    ├── kds/                       # @kitchen/kds -> https://kds.mobiware.app
    │   ├── src/components/kds/    # KdsScreen, TicketCard, OrderTimer, ConsolidatedBar
    │   └── wrangler.json          # Dominio: kds.mobiware.app
    │
    └── comanda/                   # @kitchen/comanda -> https://comanda.mobiware.app
        ├── src/components/pos/    # PosScreen, ProductGrid, Cart, OpenOrdersDialog
        └── wrangler.json          # Dominio: comanda.mobiware.app
```

---

## 2. Aplicaciones y Dominios en Vivo

| Sub-Aplicación | Paquete | URL de Producción | Propósito |
| :--- | :--- | :--- | :--- |
| **KDS** | `@kitchen/kds` | [https://kds.mobiware.app](https://kds.mobiware.app) | Pantalla táctil interactiva para estaciones de cocina (SPEC-WKDS1). |
| **Comanda** | `@kitchen/comanda` | [https://comanda.mobiware.app](https://comanda.mobiware.app) | Comandero móvil táctil para meseros y sala (SPEC-WCMD1). |
| **Common** | `@kitchen/common` | *(In-repo)* | Núcleo compartido de sesión PIN, cliente OpenAPI y Web Audio. |

---

## 3. Comandos de Desarrollo y Operación

```bash
# Instalar dependencias del workspace
pnpm install

# Iniciar servidor de desarrollo para una app específica
pnpm dev:kds        # Inicia KDS en localhost
pnpm dev:comanda    # Inicia Comandero en localhost

# Ejecutar suite de pruebas unitarias (Vitest)
pnpm test

# Linteo y verificación de tipos
pnpm lint
pnpm typecheck

# Compilar todos los bundles de producción
pnpm build

# Desplegar aplicaciones a Cloudflare Edge
pnpm deploy:kds     # Despliega kds.mobiware.app
pnpm deploy:comanda # Despliega comanda.mobiware.app
pnpm deploy:all     # Despliega ambas aplicaciones

# Regenerar tipos OpenAPI desde wared
pnpm api:gen
```

---

## 4. Colaboradores y Gobernanza

Colaboradores asignados:
- **@carlosquijano** (Admin)
- **@warhtek** (Write / Push)
- **@danquijano** (Read / Pull)

---
Copyright © 2026 **M.O.B.I.™** (Machine Oriented Brilliant Ideas™)  
Transforming ideas into high-impact digital solutions. 🚀  
[wearemobi.com](https://wearemobi.com)
