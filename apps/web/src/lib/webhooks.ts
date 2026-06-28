import { apiRequest } from "@/lib/api";

export interface WebhookEndpoint {
  id: string;
  name: string;
  direction: "incoming" | "outgoing";
  url: string | null;
  target_url: string | null;
  workflow_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  endpoint_id: string;
  direction: string;
  status: "pending" | "success" | "failed";
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown> | null;
  status_code: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  completed_at: string | null;
}

export function listWebhooks(token: string) {
  return apiRequest<WebhookEndpoint[]>("/api/v1/webhooks", { token });
}

export function createWebhook(
  token: string,
  data: {
    name: string;
    direction: "incoming" | "outgoing";
    workflow_id?: string;
    target_url?: string;
  },
) {
  return apiRequest<{ endpoint: WebhookEndpoint; secret: string | null; message: string }>(
    "/api/v1/webhooks",
    { method: "POST", token, body: JSON.stringify(data) },
  );
}

export function deleteWebhook(token: string, id: string) {
  return apiRequest<void>(`/api/v1/webhooks/${id}`, { method: "DELETE", token });
}

export function rotateWebhookSecret(token: string, id: string) {
  return apiRequest<{ secret: string; message: string }>(
    `/api/v1/webhooks/${id}/rotate-secret`,
    { method: "POST", token },
  );
}

export function listWebhookLogs(token: string, status?: string) {
  const qs = status ? `?status_filter=${status}` : "";
  return apiRequest<WebhookLog[]>(`/api/v1/webhooks/logs${qs}`, { token });
}

export function retryWebhookLog(token: string, logId: string) {
  return apiRequest<WebhookLog>(`/api/v1/webhooks/logs/${logId}/retry`, {
    method: "POST",
    token,
  });
}
