"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Brain,
  Coins,
  Loader2,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAnalyticsOverview } from "@/lib/analytics";
import type { AnalyticsOverview } from "@/types/analytics";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

function formatDateLabel(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

function formatCurrency(n: number) {
  const useMicro = Math.abs(n) > 0 && Math.abs(n) < 0.01;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: useMicro ? 6 : 2,
    maximumFractionDigits: useMicro ? 6 : 4,
  }).format(n);
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label ? formatDateLabel(String(label)) : ""}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" && entry.name.includes("Cost")
            ? formatCurrency(entry.value)
            : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function AnalyticsDashboard() {
  const { token } = useAuth();
  const [days, setDays] = useState("30");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const overview = await getAnalyticsOverview(token, Number(days));
      setData(overview);
    } finally {
      setIsLoading(false);
    }
  }, [token, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary;
  const workflowChart = (data?.workflow_runs_timeseries ?? []).map((p) => ({
    ...p,
    label: formatDateLabel(p.date),
  }));
  const tokenChart = (data?.token_usage_timeseries ?? []).map((p) => ({
    ...p,
    label: formatDateLabel(p.date),
  }));
  const aiChart = (data?.ai_requests_timeseries ?? []).map((p) => ({
    ...p,
    label: formatDateLabel(p.date),
  }));
  const leadChart = (data?.lead_funnel ?? []).map((p) => ({
    name: LEAD_STATUS_LABELS[p.status] ?? p.status,
    value: p.count,
    status: p.status,
  }));

  return (
    <DashboardShell>
      <DashboardHeader
        title="Analytics"
        description="Workflow performance, AI usage, and lead conversion"
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Metrics for the last {days} days
          </p>
          <Select value={days} onValueChange={(v) => v && setDays(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : summary ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Workflow Runs"
                value={formatNumber(summary.workflow_runs)}
                subtitle={`${summary.workflow_success_rate}% success rate`}
                icon={Zap}
              />
              <KpiCard
                title="AI Requests"
                value={formatNumber(summary.ai_requests)}
                subtitle={`${formatNumber(summary.total_tokens)} tokens used`}
                icon={Brain}
              />
              <KpiCard
                title="Estimated Cost"
                value={formatCurrency(summary.estimated_cost_usd)}
                subtitle={`${formatNumber(summary.prompt_tokens)} in · ${formatNumber(summary.completion_tokens)} out`}
                icon={Coins}
              />
              <KpiCard
                title="Lead Conversion"
                value={`${summary.lead_conversion_rate}%`}
                subtitle={`${summary.converted_leads} of ${summary.total_leads} leads`}
                icon={Target}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="size-4" />
                    Workflow Runs
                  </CardTitle>
                  <CardDescription>Completed vs failed executions per day</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={workflowChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        name="Completed"
                        stackId="1"
                        stroke={CHART_COLORS[0]}
                        fill={CHART_COLORS[0]}
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        name="Failed"
                        stackId="1"
                        stroke={CHART_COLORS[3]}
                        fill={CHART_COLORS[3]}
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="size-4" />
                    Success Rate
                  </CardTitle>
                  <CardDescription>Overall workflow completion rate</CardDescription>
                </CardHeader>
                <CardContent className="flex h-72 flex-col items-center justify-center">
                  <div
                    className="relative flex size-40 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(var(--chart-1) ${summary.workflow_success_rate}%, var(--muted) 0)`,
                    }}
                  >
                    <div className="flex size-28 flex-col items-center justify-center rounded-full bg-card">
                      <span className="text-3xl font-bold">{summary.workflow_success_rate}%</span>
                      <span className="text-xs text-muted-foreground">success</span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {summary.failed_executions} failed execution
                    {summary.failed_executions === 1 ? "" : "s"} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="size-4" />
                    Token Usage
                  </CardTitle>
                  <CardDescription>Daily token consumption</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tokenChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="tokens" name="Tokens" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Coins className="size-4" />
                    Daily Cost
                  </CardTitle>
                  <CardDescription>Estimated AI spend per day</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tokenChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="cost_usd"
                        name="Cost (USD)"
                        stroke={CHART_COLORS[2]}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="size-4" />
                    AI Requests
                  </CardTitle>
                  <CardDescription>Agent runs per day</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={aiChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke={CHART_COLORS[0]}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="failed"
                        name="Failed"
                        stroke={CHART_COLORS[3]}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="size-4" />
                    Lead Conversion
                  </CardTitle>
                  <CardDescription>Leads by pipeline status</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  {leadChart.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No leads yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={leadChart}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {leadChart.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4" />
                  Failed Executions
                </CardTitle>
                <CardDescription>Recent workflow and AI failures</CardDescription>
              </CardHeader>
              <CardContent>
                {(data?.recent_failures ?? []).length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No failures in this period
                  </p>
                ) : (
                  <ul className="divide-y">
                    {data!.recent_failures.map((item) => (
                      <li key={`${item.type}-${item.id}`} className="flex gap-3 py-3 text-sm">
                        <Badge variant="outline" className="shrink-0 capitalize">
                          {item.type}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-muted-foreground">
                            {item.message ?? "Unknown error"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(item.occurred_at), "MMM d, yyyy HH:mm")}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
