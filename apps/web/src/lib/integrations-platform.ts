import { apiRequest } from "@/lib/api";

export interface IntegrationCard {
  slug: string;
  name: string;
  description: string;
  auth_type: string;
  status: "connected" | "disconnected";
  health_status: string;
  connection_id: string | null;
  account_email: string | null;
  display_name: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  connect_url: string | null;
  settings: Record<string, unknown>;
}

export interface IntegrationConnectionDetail {
  id: string;
  slug: string;
  name: string;
  display_name: string;
  status: string;
  health_status: string;
  account_email: string | null;
  external_id: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
  has_api_key: boolean;
  api_key_masked: boolean;
  instance_url?: string | null;
  version?: string | null;
  workflows_imported?: number | null;
}

export function listIntegrations(token: string) {
  return apiRequest<IntegrationCard[]>("/api/v1/integrations", { token });
}

export function getIntegrationStatus(token: string) {
  return apiRequest<{
    total_providers: number;
    connected: number;
    disconnected: number;
    unhealthy: number;
    providers: IntegrationCard[];
  }>("/api/v1/integrations/status", { token });
}

export function connectNotion(token: string, apiKey?: string | null) {
  const body: Record<string, unknown> = { provider: "notion" };
  if (apiKey) body.api_key = apiKey;
  return apiRequest<{ connection_id: string; status: string; message: string }>(
    "/api/v1/integrations/connect",
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    },
  );
}

export function connectN8n(token: string, baseUrl: string, apiKey: string) {
  return apiRequest<{ connection_id: string; status: string; message: string }>(
    "/api/v1/integrations/connect",
    {
      method: "POST",
      token,
      body: JSON.stringify({ provider: "n8n", base_url: baseUrl, api_key: apiKey }),
    },
  );
}

export function testIntegration(token: string, connectionId: string) {
  return apiRequest<{ healthy: boolean; message: string; version?: string }>(
    "/api/v1/integrations/test",
    {
      method: "POST",
      token,
      body: JSON.stringify({ connection_id: connectionId }),
    },
  );
}

export function disconnectIntegration(token: string, connectionId: string) {
  return apiRequest<void>(`/api/v1/integrations/${connectionId}`, {
    method: "DELETE",
    token,
  });
}

export function updateN8nSettings(
  token: string,
  connectionId: string,
  data: { base_url?: string; api_key?: string },
) {
  return apiRequest<IntegrationConnectionDetail>(
    `/api/v1/integrations/${connectionId}/n8n`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    },
  );
}

export function getConnectUrl(path: string, token?: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  // OAuth connect endpoints are reached via full-page browser navigation, which cannot
  // send an Authorization header, so the JWT is passed as a query param for that hop.
  if (token && path.includes("?")) {
    return `${base}${path}&token=${encodeURIComponent(token)}`;
  }
  if (token) {
    return `${base}${path}?token=${encodeURIComponent(token)}`;
  }
  return `${base}${path}`;
}
