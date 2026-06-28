export interface N8nMetadata {
  source?: string;
  n8n_workflow_id?: string | null;
  n8n_instance_id?: string | null;
  n8n_webhook_url?: string | null;
  remote_name?: string | null;
  imported_at?: string | null;
  exported_at?: string | null;
  last_synced_at?: string | null;
  last_triggered_at?: string | null;
}

export interface N8nRemoteWorkflow {
  id: string;
  name: string;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface N8nImportResponse {
  workflow_id: string;
  name: string;
  nodes_imported: number;
  connections_imported?: number;
  unsupported_count?: number;
  unsupported_types?: string[];
  created?: boolean;
  n8n_metadata: N8nMetadata;
}

export interface N8nExportResponse {
  workflow_id: string;
  name: string;
  n8n_workflow: Record<string, unknown>;
  n8n_metadata: N8nMetadata;
}

export interface N8nPushResponse {
  n8n_workflow_id: string;
  name: string;
  activated?: boolean;
  n8n_metadata: N8nMetadata;
}

export interface N8nTriggerResponse {
  success: boolean;
  n8n_workflow_id?: string | null;
  response?: Record<string, unknown> | null;
  error?: string | null;
}

export interface N8nNodeConfig {
  connectionId?: string;
  n8nWorkflowId?: string;
  webhookUrl?: string;
  payload?: Record<string, string>;
}
