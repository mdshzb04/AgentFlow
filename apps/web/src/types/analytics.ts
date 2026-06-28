export interface AnalyticsSummary {
  workflow_runs: number;
  workflow_success_rate: number;
  ai_requests: number;
  failed_executions: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  total_leads: number;
  converted_leads: number;
  lead_conversion_rate: number;
}

export interface TimeSeriesPoint {
  date: string;
  total: number;
  completed: number;
  failed: number;
}

export interface TokenUsagePoint {
  date: string;
  tokens: number;
  cost_usd: number;
}

export interface AiRequestPoint {
  date: string;
  total: number;
  failed: number;
}

export interface LeadStatusCount {
  status: string;
  count: number;
}

export interface FailedExecutionItem {
  type: string;
  id: string;
  message: string | null;
  occurred_at: string;
}

export interface AnalyticsOverview {
  period_days: number;
  summary: AnalyticsSummary;
  workflow_runs_timeseries: TimeSeriesPoint[];
  token_usage_timeseries: TokenUsagePoint[];
  ai_requests_timeseries: AiRequestPoint[];
  lead_funnel: LeadStatusCount[];
  recent_failures: FailedExecutionItem[];
}
