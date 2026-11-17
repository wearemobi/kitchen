import createClient from "openapi-fetch";
import type { paths } from "./schema";

export type { paths } from "./schema";

export type Cashier = NonNullable<
  paths["/v1/auth/cashiers"]["get"]["responses"]["200"]["content"]["application/json"]["cashiers"]
>[number];

export type PinLoginResponse =
  paths["/v1/auth/login-pin"]["post"]["responses"]["200"]["content"]["application/json"];

export function createApiClient(options: {
  resolveTenantId: () => string;
  getToken: () => string | null;
  baseUrl?: string;
}) {
  const envBaseUrl = (
    import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }
  ).env?.VITE_API_BASE_URL;

  const baseUrl = options.baseUrl ?? envBaseUrl ?? "https://api.mobiware.app";

  const client = createClient<paths>({
    baseUrl,
    fetch: (input: Request) => globalThis.fetch(input),
  });

  client.use({
    onRequest({ request }) {
      const tenantId = options.resolveTenantId();
      if (tenantId) {
        request.headers.set("X-Tenant-Id", tenantId);
      }
      const token = options.getToken();
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
      return request;
    },
  });

  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export async function fetchCashiers(client: ApiClient, tenantId: string): Promise<Cashier[]> {
  const { data, error } = await client.GET("/v1/auth/cashiers", {
    params: { header: { "X-Tenant-Id": tenantId } },
  });
  if (error || !data) {
    throw new Error("No fue posible cargar los operadores de este tenant.");
  }
  return data.cashiers ?? [];
}

export async function loginWithPin(
  client: ApiClient,
  tenantId: string,
  username: string,
  pin: string,
): Promise<PinLoginResponse> {
  const { data, error, response } = await client.POST("/v1/auth/login-pin", {
    params: { header: { "X-Tenant-Id": tenantId } },
    body: { username, pin },
  });
  if (error || !data) {
    const detail =
      response.status === 401
        ? "PIN incorrecto para este operador."
        : "No fue posible iniciar sesión.";
    throw new Error(detail);
  }
  return data;
}
