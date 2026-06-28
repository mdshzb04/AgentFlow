import { apiRequest } from "@/lib/api";
import type {
  AgentExecution,
  AgentRunPayload,
  PromptTemplate,
} from "@/types/agent";
import type { WorkflowExecuteResponse } from "@/types/integrations";

export function listTemplates(token: string): Promise<PromptTemplate[]> {
  return apiRequest<PromptTemplate[]>("/api/v1/agent/templates", { token });
}

export function runAgent(token: string, payload: AgentRunPayload): Promise<AgentExecution> {
  return apiRequest<AgentExecution>("/api/v1/agent/run", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function listExecutions(
  token: string,
  params?: { workflow_id?: string; limit?: number; offset?: number },
): Promise<AgentExecution[]> {
  const search = new URLSearchParams();
  if (params?.workflow_id) search.set("workflow_id", params.workflow_id);
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
  const qs = search.toString();
  return apiRequest<AgentExecution[]>(`/api/v1/agent/executions${qs ? `?${qs}` : ""}`, {
    token,
  });
}

export function getExecution(token: string, id: string): Promise<AgentExecution> {
  return apiRequest<AgentExecution>(`/api/v1/agent/executions/${id}`, { token });
}

export function executeWorkflow(
  token: string,
  workflowId: string,
  input: Record<string, unknown> = {},
): Promise<WorkflowExecuteResponse> {
  return apiRequest<WorkflowExecuteResponse>(
    `/api/v1/agent/workflows/${workflowId}/execute`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ input }),
    },
  );
}
