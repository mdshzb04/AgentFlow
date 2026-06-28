export type LLMProvider = "openai" | "anthropic";
export type OutputMode = "text" | "json";
export type ExecutionStatus = "pending" | "running" | "completed" | "failed";
export type TemplateCategory =
  | "lead_qualification"
  | "email_generation"
  | "meeting_summary"
  | "custom";

export interface PromptTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  system_prompt: string;
  user_prompt_template: string;
  output_mode: OutputMode;
  json_schema: Record<string, unknown> | null;
  tools: Record<string, unknown>[] | null;
  default_provider: LLMProvider;
  default_model: string | null;
  is_builtin: boolean;
}

export interface AiNodeConfig {
  provider?: LLMProvider;
  model?: string;
  template?: string;
  systemPrompt?: string;
  userPrompt?: string;
  outputMode?: OutputMode;
  jsonSchema?: Record<string, unknown>;
  tools?: Record<string, unknown>[];
  temperature?: number;
}

export interface AgentRunPayload {
  provider?: LLMProvider;
  model?: string;
  template?: string;
  system_prompt?: string;
  user_prompt?: string;
  variables?: Record<string, unknown>;
  input?: Record<string, unknown>;
  output_mode?: OutputMode;
  json_schema?: Record<string, unknown>;
  tools?: Record<string, unknown>[];
  workflow_id?: string;
  node_id?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface AgentExecution {
  id: string;
  user_id: string;
  workflow_id: string | null;
  node_id: string | null;
  template_slug: string | null;
  provider: string;
  model: string;
  status: ExecutionStatus;
  input_data: Record<string, unknown>;
  output_data: {
    content?: string;
    parsed?: Record<string, unknown>;
  } | null;
  tool_calls: {
    name: string;
    arguments: Record<string, unknown>;
    result: Record<string, unknown>;
  }[] | null;
  steps: Record<string, unknown>[] | null;
  usage: Record<string, number> | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export const TEMPLATE_VARIABLES: Record<string, { label: string; placeholder: string }[]> = {
  lead_qualification: [
    { label: "Name", placeholder: "Jane Smith" },
    { label: "Company", placeholder: "Acme Corp" },
    { label: "Title", placeholder: "VP Engineering" },
    { label: "Email", placeholder: "jane@acme.com" },
    { label: "Industry", placeholder: "SaaS" },
    { label: "Company Size", placeholder: "50-200" },
    { label: "Source", placeholder: "Website form" },
    { label: "Notes", placeholder: "Requested demo" },
  ],
  email_generation: [
    { label: "Email Type", placeholder: "cold outreach" },
    { label: "Recipient Name", placeholder: "Jane Smith" },
    { label: "Recipient Title", placeholder: "VP Engineering" },
    { label: "Recipient Company", placeholder: "Acme Corp" },
    { label: "Sender Name", placeholder: "Alex" },
    { label: "Context", placeholder: "Met at conference" },
    { label: "Tone", placeholder: "professional" },
    { label: "Key Points", placeholder: "Product benefits" },
    { label: "Call to Action", placeholder: "Schedule a demo" },
  ],
  meeting_summary: [
    { label: "Meeting Title", placeholder: "Q1 Planning" },
    { label: "Meeting Date", placeholder: "2026-06-26" },
    { label: "Attendees", placeholder: "Jane, Alex, Bob" },
    { label: "Transcript", placeholder: "Paste meeting transcript..." },
  ],
  voice_crm_assistant: [
    { label: "User Message", placeholder: "Say or type your CRM request..." },
  ],
};
