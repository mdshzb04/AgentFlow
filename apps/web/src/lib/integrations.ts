import { API_URL } from "@/lib/constants";
import { apiRequest } from "@/lib/api";
import type {
  IntegrationAccount,
  StepExecution,
  WebhookCreateResponse,
  WorkflowExecution,
} from "@/types/integrations";

export function listIntegrationAccounts(
  token: string,
  provider?: string,
): Promise<IntegrationAccount[]> {
  const qs = provider ? `?provider=${provider}` : "";
  return apiRequest<IntegrationAccount[]>(`/api/v1/integrations/accounts${qs}`, { token });
}

export function disconnectAccount(token: string, accountId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/integrations/accounts/${accountId}`, {
    method: "DELETE",
    token,
  });
}

export function getConnectUrl(path: string): string {
  return `${API_URL}${path}`;
}

export function createWebhook(
  token: string,
  name: string,
  workflowId?: string,
): Promise<WebhookCreateResponse> {
  return apiRequest<WebhookCreateResponse>("/api/v1/integrations/webhooks", {
    method: "POST",
    token,
    body: JSON.stringify({
      name,
      workflow_id: workflowId,
    }),
  });
}

export function listWorkflowExecutions(
  token: string,
  workflowId?: string,
): Promise<WorkflowExecution[]> {
  const qs = workflowId ? `?workflow_id=${workflowId}` : "";
  return apiRequest<WorkflowExecution[]>(`/api/v1/integrations/executions${qs}`, { token });
}

export function getWorkflowExecution(
  token: string,
  executionId: string,
): Promise<WorkflowExecution> {
  return apiRequest<WorkflowExecution>(`/api/v1/integrations/executions/${executionId}`, {
    token,
  });
}

export function listStepExecutions(token: string, limit = 100): Promise<StepExecution[]> {
  return apiRequest<StepExecution[]>(`/api/v1/integrations/steps?limit=${limit}`, { token });
}
