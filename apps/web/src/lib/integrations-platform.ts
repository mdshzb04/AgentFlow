import { apiRequest } from "@/lib/api";

export interface IntegrationCard {
  slug: string;
  name: string;
  description: string;
  auth_type: string;
  status: "CONNECTED" | "DISCONNECTED" | string;
  health_status: string;
  connection_id: string | null;
  account_email: string | null;
  display_name: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  connect_url: string | null;
  settings: Record<string, unknown>;
  metrics: Record<string, unknown>;
}

export interface IntegrationMetrics {
  google_sheets: {
    spreadsheet_name: string | null;
    spreadsheet_url: string | null;
    rows_synced: number;
    rows_by_entity: Record<string, number>;
    last_synced_at: string | null;
    last_error: { message: string; at: string } | null;
    errors_total: number;
  };
  notion: {
    workspace_name: string | null;
    database_name: string;
    database_id: string | null;
    pages_total: number;
    pages_by_type: Record<string, number>;
    last_synced_at: string | null;
    last_page_created_at: string | null;
    last_error: { message: string; at: string } | null;
    errors_total: number;
  };
  gmail: {
    emails_sent_today: number;
    emails_sent_total: number;
    emails_failed_today: number;
    emails_failed_total: number;
    last_sent_at: string | null;
    last_error: { message: string; at: string } | null;
    by_related_entity: Record<string, number>;
  };
  openai: {
    model: string | null;
    requests_total: number;
    requests_today: number;
    tokens_total: number;
    tokens_today: number;
    cost_usd_total: number;
    cost_usd_today: number;
    avg_latency_ms: number;
    failures_today: number;
    last_request_at: string | null;
    last_error: { message: string; at: string } | null;
  };
  n8n: {
    instance_url: string | null;
    version: string | null;
    imported_workflows: number;
    executions_total: number;
    executions_successful: number;
    executions_failed: number;
    last_execution_at: string | null;
    last_execution_status: string | null;
  };
  webhooks: {
    endpoints_total: number;
    endpoints_incoming: number;
    endpoints_outgoing: number;
    endpoints_active: number;
    deliveries_total: number;
    deliveries_success: number;
    deliveries_failed: number;
    retries_total: number;
    last_event_at: string | null;
    last_event_status: string | null;
  };
  generated_at: string | null;
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

export function getIntegrationMetrics(token: string) {
  return apiRequest<IntegrationMetrics>("/api/v1/integrations/metrics", { token });
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
