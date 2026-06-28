"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleSlash,
  Clock,
  Database,
  FileSpreadsheet,
  Inbox,
  Mail,
  Send,
  Webhook,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getIntegrationMetrics } from "@/lib/integrations-platform";
import { cn } from "@/lib/utils";

type AnyDict = Record<string, unknown>;

const DASH = "—";

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "muted" | "danger" | "success";
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3 shrink-0" />
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold leading-none",
          tone === "danger" && "text-destructive",
          tone === "muted" && "text-muted-foreground",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center">
      <CircleSlash className="mx-auto size-5 text-muted-foreground" />
      <p className="mt-1.5 text-sm font-medium text-foreground">{message}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function timeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return null;
  }
}

export function GoogleSheetsMetrics({ data }: { data: AnyDict }) {
  const rowsSynced = Number(data.rows_synced ?? 0);
  const lastSynced = timeAgo(data.last_synced_at as string | null);
  const spreadsheetUrl = data.spreadsheet_url as string | null;
  const spreadsheetName = (data.spreadsheet_name as string | null) ?? "AgentFlow CRM";
  const lastError = data.last_error as { message: string; at: string } | null;
  const errorsTotal = Number(data.errors_total ?? 0);
  const byEntity = (data.rows_by_entity ?? {}) as Record<string, number>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <FileSpreadsheet className="size-3" />
          <span className="font-medium text-foreground">{spreadsheetName}</span>
        </p>
        {spreadsheetUrl && (
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline dark:text-violet-400"
          >
            Open
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          icon={ArrowUp}
          label="Rows synced"
          value={rowsSynced}
          tone={rowsSynced > 0 ? "success" : "muted"}
        />
        <Stat
          icon={AlertTriangle}
          label="Sync errors"
          value={errorsTotal}
          tone={errorsTotal > 0 ? "danger" : "muted"}
        />
        <Stat
          icon={Clock}
          label="Last sync"
          value={lastSynced ?? DASH}
          hint={lastSynced ?? undefined}
        />
      </div>
      {rowsSynced === 0 ? (
        <EmptyState
          message={errorsTotal > 0 ? "Sync failed" : "No rows synced yet"}
          hint={
            errorsTotal > 0
              ? lastError?.message ?? "Reconnect Google Sheets to retry."
              : spreadsheetUrl
                ? "Create a lead, contact, deal, task, or note to start syncing."
                : "Reconnect Google Sheets to grant the drive.file scope so the AgentFlow CRM spreadsheet can be auto-created."
          }
        />
      ) : (
        Object.keys(byEntity).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Object.entries(byEntity).map(([entity, count]) => (
              <Badge key={entity} variant="secondary" className="text-[10px]">
                {entity}: {count}
              </Badge>
            ))}
          </div>
        )
      )}
      {lastError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
          Last error: {lastError.message}
        </div>
      )}
    </div>
  );
}

export function NotionMetrics({ data }: { data: AnyDict }) {
  const pagesTotal = Number(data.pages_total ?? 0);
  const byType = (data.pages_by_type ?? {}) as Record<string, number>;
  const lastSynced = timeAgo(data.last_synced_at as string | null);
  const lastPageCreated = timeAgo(data.last_page_created_at as string | null);
  const errorsTotal = Number(data.errors_total ?? 0);
  const lastError = data.last_error as { message: string; at: string } | null;
  const workspaceName = data.workspace_name as string | null;
  const databaseName = (data.database_name as string | null) ?? "AgentFlow CRM";

  return (
    <div className="space-y-2">
      {workspaceName && (
        <p className="text-[11px] text-muted-foreground">
          Workspace: <span className="font-medium text-foreground">{workspaceName}</span>
        </p>
      )}
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Database className="size-3" />
        Database: <span className="font-medium text-foreground">{databaseName}</span>
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          icon={Database}
          label="Pages synced"
          value={pagesTotal}
          tone={pagesTotal > 0 ? "success" : "muted"}
        />
        <Stat
          icon={AlertTriangle}
          label="Sync errors"
          value={errorsTotal}
          tone={errorsTotal > 0 ? "danger" : "muted"}
        />
        <Stat
          icon={Clock}
          label="Last page"
          value={lastPageCreated ?? DASH}
          hint={lastPageCreated ?? lastSynced ?? undefined}
        />
      </div>
      {pagesTotal === 0 ? (
        <EmptyState
          message="No pages synced yet"
          hint="Create any CRM record to create the AgentFlow CRM database in Notion."
        />
      ) : Object.keys(byType).length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Object.entries(byType).map(([type, count]) => (
            <Badge key={type} variant="secondary" className="text-[10px]">
              {type}: {count}
            </Badge>
          ))}
        </div>
      ) : null}
      {lastError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
          Last error: {lastError.message}
        </div>
      )}
    </div>
  );
}

export function GmailMetrics({ data }: { data: AnyDict }) {
  const sentToday = Number(data.emails_sent_today ?? 0);
  const sentTotal = Number(data.emails_sent_total ?? 0);
  const failedToday = Number(data.emails_failed_today ?? 0);
  const failedTotal = Number(data.emails_failed_total ?? 0);
  const lastSent = timeAgo(data.last_sent_at as string | null);
  const lastError = data.last_error as { message: string; at: string } | null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          icon={Send}
          label="Sent today"
          value={sentToday}
          tone={sentToday > 0 ? "success" : "muted"}
        />
        <Stat
          icon={Inbox}
          label="Sent total"
          value={sentTotal}
        />
        <Stat
          icon={AlertTriangle}
          label="Failed today"
          value={failedToday}
          tone={failedToday > 0 ? "danger" : "muted"}
        />
      </div>
      {sentTotal === 0 ? (
        <EmptyState
          message="No emails sent yet"
          hint="Add a Gmail node to a workflow or send a test email from the API."
        />
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Last sent {lastSent ?? "—"}
          {failedTotal > 0 && (
            <span className="ml-1 text-destructive">· {failedTotal} failed total</span>
          )}
        </p>
      )}
      {lastError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
          Last error: {lastError.message}
        </div>
      )}
    </div>
  );
}

export function OpenAIMetrics({ data, configured }: { data: AnyDict; configured: boolean }) {
  const requestsTotal = Number(data.requests_total ?? 0);
  const requestsToday = Number(data.requests_today ?? 0);
  const tokensTotal = Number(data.tokens_total ?? 0);
  const tokensToday = Number(data.tokens_today ?? 0);
  const costTotal = Number(data.cost_usd_total ?? 0);
  const costToday = Number(data.cost_usd_today ?? 0);
  const avgLatency = Number(data.avg_latency_ms ?? 0);
  const failures = Number(data.failures_today ?? 0);
  const model = (data.model as string | null) ?? null;
  const lastReq = timeAgo(data.last_request_at as string | null);
  const lastError = data.last_error as { message: string; at: string } | null;

  return (
    <div className="space-y-2">
      {model && (
        <p className="text-[11px] text-muted-foreground">
          Model: <span className="font-mono text-foreground">{model}</span>
          {avgLatency > 0 && <> · avg {avgLatency.toLocaleString()}ms</>}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          icon={Activity}
          label="Requests"
          value={requestsTotal}
          hint={requestsToday > 0 ? `${requestsToday} today` : undefined}
          tone={requestsTotal > 0 ? "success" : "muted"}
        />
        <Stat
          icon={ArrowUp}
          label="Tokens"
          value={tokensTotal.toLocaleString()}
          hint={tokensToday > 0 ? `${tokensToday.toLocaleString()} today` : undefined}
        />
        <Stat
          icon={Mail}
          label="Cost (USD)"
          value={`$${costTotal.toFixed(4)}`}
          hint={costToday > 0 ? `$${costToday.toFixed(4)} today` : undefined}
        />
        <Stat
          icon={AlertTriangle}
          label="Failures today"
          value={failures}
          tone={failures > 0 ? "danger" : "muted"}
        />
      </div>
      {!configured ? (
        <EmptyState
          message="OpenAI not configured"
          hint="Set OPENAI_API_KEY in the server environment to enable AI features."
        />
      ) : requestsTotal === 0 ? (
        <EmptyState
          message="No requests yet"
          hint="Use the AI builder, chat, summarize, or speech-to-text endpoints to start."
        />
      ) : (
        <p className="text-[11px] text-muted-foreground">Last request {lastReq ?? "—"}</p>
      )}
      {lastError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
          Last error: {lastError.message}
        </div>
      )}
    </div>
  );
}

export function N8nMetrics({ data }: { data: AnyDict }) {
  const instanceUrl = (data.instance_url as string | null) ?? null;
  const version = (data.version as string | null) ?? null;
  const imported = Number(data.imported_workflows ?? 0);
  const total = Number(data.executions_total ?? 0);
  const successful = Number(data.executions_successful ?? 0);
  const failed = Number(data.executions_failed ?? 0);
  const lastExec = timeAgo(data.last_execution_at as string | null);
  const lastStatus = (data.last_execution_status as string | null) ?? null;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : null;

  return (
    <div className="space-y-2">
      {instanceUrl && (
        <p className="truncate text-[11px] text-muted-foreground">
          Instance: <span className="font-mono text-foreground">{instanceUrl}</span>
          {version && version !== "unknown" && (
            <span className="ml-1">· v{version}</span>
          )}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          icon={Workflow}
          label="Imported"
          value={imported}
          tone={imported > 0 ? "success" : "muted"}
        />
        <Stat
          icon={Activity}
          label="Executions"
          value={total}
          tone={total > 0 ? "success" : "muted"}
        />
        <Stat
          icon={CheckCircle2}
          label="Successful"
          value={successful}
          tone="success"
        />
        <Stat
          icon={AlertTriangle}
          label="Failed"
          value={failed}
          tone={failed > 0 ? "danger" : "muted"}
        />
      </div>
      {imported === 0 && total === 0 ? (
        <EmptyState
          message="No workflows imported yet"
          hint="Open Settings on this card to configure the API key, then click Import Workflows."
        />
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {successRate !== null ? `Success rate: ${successRate}%` : "Awaiting first run"}
          {lastExec && (
            <span className="ml-1">
              · last {lastStatus ?? "run"} {lastExec}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export function WebhookMetrics({ data }: { data: AnyDict }) {
  const total = Number(data.endpoints_total ?? 0);
  const incoming = Number(data.endpoints_incoming ?? 0);
  const outgoing = Number(data.endpoints_outgoing ?? 0);
  const active = Number(data.endpoints_active ?? 0);
  const deliveries = Number(data.deliveries_total ?? 0);
  const success = Number(data.deliveries_success ?? 0);
  const failed = Number(data.deliveries_failed ?? 0);
  const retries = Number(data.retries_total ?? 0);
  const lastEvent = timeAgo(data.last_event_at as string | null);
  const lastStatus = (data.last_event_status as string | null) ?? null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          icon={Webhook}
          label="Endpoints"
          value={total}
          hint={`${active} active`}
          tone={total > 0 ? "success" : "muted"}
        />
        <Stat
          icon={ArrowDown}
          label="Deliveries"
          value={deliveries}
          tone={deliveries > 0 ? "success" : "muted"}
        />
        <Stat
          icon={CheckCircle2}
          label="Successful"
          value={success}
          tone="success"
        />
        <Stat
          icon={AlertTriangle}
          label="Failed"
          value={failed}
          tone={failed > 0 ? "danger" : "muted"}
        />
      </div>
      {total === 0 ? (
        <EmptyState
          message="No webhook endpoints yet"
          hint="Create an incoming or outgoing webhook to start receiving or sending events."
        />
      ) : deliveries === 0 ? (
        <EmptyState
          message="No webhook deliveries yet"
          hint={`${incoming} incoming · ${outgoing} outgoing · ${active} active endpoints waiting for traffic.`}
        />
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {incoming} incoming · {outgoing} outgoing
          {retries > 0 && <span className="ml-1">· {retries} retries</span>}
          {lastEvent && (
            <span className="ml-1">
              · last {lastStatus ?? "event"} {lastEvent}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export function IntegrationMetricsPanel({
  slug,
  openaiConfigured,
  initial,
  token,
}: {
  slug: string;
  openaiConfigured: boolean;
  initial: AnyDict;
  token: string;
}) {
  const [data, setData] = useState<AnyDict>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    getIntegrationMetrics(token)
      .then((m) => {
        if (cancelled) return;
        setData((m as AnyDict)[slug] ?? {});
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  if (loading && !data) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (slug === "google_sheets") return <GoogleSheetsMetrics data={data} />;
  if (slug === "notion") return <NotionMetrics data={data} />;
  if (slug === "gmail") return <GmailMetrics data={data} />;
  if (slug === "openai") return <OpenAIMetrics data={data} configured={openaiConfigured} />;
  if (slug === "n8n") return <N8nMetrics data={data} />;
  if (slug === "webhooks") return <WebhookMetrics data={data} />;
  return null;
}