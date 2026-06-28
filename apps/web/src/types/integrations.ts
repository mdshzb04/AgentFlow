export type IntegrationProvider = "gmail" | "google_sheets" | "webhook" | "n8n";

export interface IntegrationAccount {
  id: string;
  provider: IntegrationProvider;
  name: string;
  external_account_id: string | null;
  account_email: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WebhookCreateResponse {
  account: IntegrationAccount;
  webhook_url: string;
  secret: string;
}

export interface StepExecution {
  id: string;
  workflow_execution_id: string;
  workflow_id: string;
  node_id: string;
  node_type: string;
  integration_provider: string | null;
  integration_account_id: string | null;
  status: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  trigger_type: string;
  input_data: Record<string, unknown>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  steps?: StepExecution[];
}

export interface WorkflowExecuteResponse {
  workflow_execution: WorkflowExecution;
  steps: StepExecution[];
  total_steps: number;
}

export interface GmailNodeConfig {
  connectionId?: string;
  action?: "send" | "read";
  to?: string;
  subject?: string;
  body?: string;
  query?: string;
}

export interface GoogleSheetsNodeConfig {
  connectionId?: string;
  action?: "read" | "append";
  spreadsheetId?: string;
  range?: string;
  values?: string[][];
}

export interface WebhookNodeConfig {
  direction?: "inbound" | "outbound";
  connectionId?: string;
  url?: string;
  method?: string;
  bodyTemplate?: string;
  secret?: string;
}

export const INTEGRATION_PROVIDERS: {
  id: IntegrationProvider;
  name: string;
  description: string;
  connectPath: string;
}[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Send and read emails",
    connectPath: "/api/v1/integrations/gmail/connect",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    description: "Read and append spreadsheet rows",
    connectPath: "/api/v1/integrations/google-sheets/connect",
  },
];
