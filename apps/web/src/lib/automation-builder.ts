import { apiRequest } from "@/lib/api";
import type { WorkflowDefinition } from "@/types/workflow";

export interface WebhookPlan {
  name: string;
  direction: string;
}

export interface AutomationPlan {
  name: string;
  description: string | null;
  summary: string;
  trigger_type: string;
  steps_summary: string[];
  workflow: WorkflowDefinition;
  webhook: WebhookPlan | null;
}

export interface AutomationDeployResult {
  workflow_id: string;
  workflow_name: string;
  webhook_id: string | null;
  webhook_url: string | null;
  message: string;
}

export function buildAutomation(token: string, prompt: string) {
  return apiRequest<{ plan: AutomationPlan }>("/api/v1/automation/build", {
    method: "POST",
    token,
    body: JSON.stringify({ prompt }),
  });
}

export function deployAutomation(
  token: string,
  plan: AutomationPlan,
  activate = true,
) {
  return apiRequest<AutomationDeployResult>("/api/v1/automation/deploy", {
    method: "POST",
    token,
    body: JSON.stringify({ plan, activate }),
  });
}
