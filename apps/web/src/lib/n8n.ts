import { apiRequest } from "@/lib/api";
import type { IntegrationAccount } from "@/types/integrations";
import type {
  N8nExportResponse,
  N8nImportResponse,
  N8nPushResponse,
  N8nRemoteWorkflow,
  N8nTriggerResponse,
} from "@/types/n8n";

export function connectN8n(
  token: string,
  payload: { name: string; base_url: string; api_key: string },
): Promise<IntegrationAccount> {
  return apiRequest<IntegrationAccount>("/api/v1/n8n/connect", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function listN8nRemoteWorkflows(
  token: string,
  accountId: string,
): Promise<N8nRemoteWorkflow[]> {
  return apiRequest<N8nRemoteWorkflow[]>(
    `/api/v1/n8n/remote-workflows?account_id=${accountId}`,
    { token },
  );
}

export function importN8nWorkflow(
  token: string,
  payload: {
    account_id?: string;
    n8n_workflow_id?: string;
    workflow_json?: Record<string, unknown>;
    name?: string;
  },
): Promise<N8nImportResponse> {
  return apiRequest<N8nImportResponse>("/api/v1/n8n/import", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function exportN8nWorkflow(
  token: string,
  workflowId: string,
): Promise<N8nExportResponse> {
  return apiRequest<N8nExportResponse>(`/api/v1/n8n/workflows/${workflowId}/export`, {
    token,
  });
}

export function pushWorkflowToN8n(
  token: string,
  workflowId: string,
  accountId: string,
  activate = true,
): Promise<N8nPushResponse> {
  return apiRequest<N8nPushResponse>(`/api/v1/n8n/workflows/${workflowId}/push`, {
    method: "POST",
    token,
    body: JSON.stringify({ account_id: accountId, activate }),
  });
}

export function triggerN8nWorkflow(
  token: string,
  workflowId: string,
  payload: Record<string, unknown> = {},
  accountId?: string,
): Promise<N8nTriggerResponse> {
  return apiRequest<N8nTriggerResponse>(`/api/v1/n8n/workflows/${workflowId}/trigger`, {
    method: "POST",
    token,
    body: JSON.stringify({ account_id: accountId, payload }),
  });
}

export function downloadN8nJson(filename: string, data: Record<string, unknown>) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
