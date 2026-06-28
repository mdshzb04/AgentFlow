import { apiRequest } from "@/lib/api";
import type {
  Workflow,
  WorkflowCreatePayload,
  WorkflowUpdatePayload,
} from "@/types/workflow";

export function listWorkflows(token: string): Promise<Workflow[]> {
  return apiRequest<Workflow[]>("/api/v1/workflows", { token });
}

export function getWorkflow(token: string, id: string): Promise<Workflow> {
  return apiRequest<Workflow>(`/api/v1/workflows/${id}`, { token });
}

export function createWorkflow(
  token: string,
  payload: WorkflowCreatePayload,
): Promise<Workflow> {
  return apiRequest<Workflow>("/api/v1/workflows", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateWorkflow(
  token: string,
  id: string,
  payload: WorkflowUpdatePayload,
): Promise<Workflow> {
  return apiRequest<Workflow>(`/api/v1/workflows/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteWorkflow(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/workflows/${id}`, {
    method: "DELETE",
    token,
  });
}
