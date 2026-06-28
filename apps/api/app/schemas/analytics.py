from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class AnalyticsSummary(BaseModel):
    workflow_runs: int = 0
    workflow_success_rate: float = 0.0
    ai_requests: int = 0
    failed_executions: int = 0
    total_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    estimated_cost_usd: float = 0.0
    total_leads: int = 0
    converted_leads: int = 0
    lead_conversion_rate: float = 0.0


class TimeSeriesPoint(BaseModel):
    date: str
    total: int = 0
    completed: int = 0
    failed: int = 0


class TokenUsagePoint(BaseModel):
    date: str
    tokens: int = 0
    cost_usd: float = 0.0


class AiRequestPoint(BaseModel):
    date: str
    total: int = 0
    failed: int = 0


class LeadStatusCount(BaseModel):
    status: str
    count: int


class FailedExecutionItem(BaseModel):
    type: str
    id: str
    message: str | None = None
    occurred_at: datetime


class AnalyticsOverview(BaseModel):
    period_days: int = 30
    summary: AnalyticsSummary
    workflow_runs_timeseries: list[TimeSeriesPoint] = Field(default_factory=list)
    token_usage_timeseries: list[TokenUsagePoint] = Field(default_factory=list)
    ai_requests_timeseries: list[AiRequestPoint] = Field(default_factory=list)
    lead_funnel: list[LeadStatusCount] = Field(default_factory=list)
    recent_failures: list[FailedExecutionItem] = Field(default_factory=list)
