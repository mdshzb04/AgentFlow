export type WorkflowNodeType =
  | "trigger"
  | "webhook"
  | "ai"
  | "condition"
  | "crm"
  | "n8n"
  | "gmail"
  | "google_sheets"
  | "end"
  | "n8n_native"
  | "unsupported";

export type WorkflowStatus = "draft" | "active" | "archived";

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: Record<string, unknown>;
    n8nType?: string;
    n8nNodeName?: string;
    typeVersion?: number;
    imported?: boolean;
    originalPosition?: { x: number; y: number };
    category?: string;
    displayName?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

import type { N8nMetadata } from "@/types/n8n";

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  definition: WorkflowDefinition;
  status: WorkflowStatus;
  n8n_metadata?: N8nMetadata;
  created_at: string;
  updated_at: string;
}

export interface WorkflowCreatePayload {
  name: string;
  description?: string | null;
  status?: WorkflowStatus;
  definition?: WorkflowDefinition;
}

export interface WorkflowUpdatePayload {
  name?: string;
  description?: string | null;
  status?: WorkflowStatus;
  definition?: WorkflowDefinition;
}

export const WORKFLOW_NODE_TYPES: {
  type: WorkflowNodeType;
  label: string;
  description: string;
}[] = [
  { type: "trigger", label: "Trigger", description: "Start the workflow" },
  { type: "webhook", label: "Webhook", description: "Receive HTTP requests" },
  { type: "ai", label: "AI", description: "Run an AI agent step" },
  { type: "crm", label: "CRM", description: "Create or update CRM records" },
  { type: "n8n", label: "n8n", description: "Trigger an n8n workflow" },
  { type: "condition", label: "Condition", description: "Branch on logic" },
  { type: "gmail", label: "Gmail", description: "Send or read email" },
  { type: "google_sheets", label: "Google Sheets", description: "Read or write rows" },
  { type: "end", label: "End", description: "Terminate the workflow" },
];
